"""Servidor compartido. Ejecutar desde la raíz: python hallazgos/servidor.py."""
import base64
import hashlib
import hmac
import io
import json
import os
import secrets
import sqlite3
import threading
from datetime import date
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
from modelos import Modelos, preparar

ROOT = Path(__file__).resolve().parent
DB = os.environ.get("HALLA_DB", str(ROOT.parent / "hallazgos.sqlite"))
Image.MAX_IMAGE_PIXELS = 16_000_000
inferencia = threading.Lock()

def conectar():
    conn = sqlite3.connect(DB, timeout=15)
    conn.row_factory = sqlite3.Row
    return conn

def iniciar():
    with conectar() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS reporte(id TEXT PRIMARY KEY, tipo TEXT, descripcion TEXT,
            zona TEXT, fecha TEXT, pie TEXT, miniatura TEXT, vector BLOB, llave TEXT, abierto INTEGER DEFAULT 1);
        CREATE TABLE IF NOT EXISTS mensaje(id INTEGER PRIMARY KEY, origen TEXT, destino TEXT, texto TEXT);
        """)

def limpiar(obj,k,maximo):
    v = obj.get(k,"")
    if not isinstance(v,str) or len(v)>maximo: raise ValueError("Revisa el campo " + k)
    return v.strip()

def firma(token):
    return hashlib.sha256(token.encode()).hexdigest()

def propio(c,obj):
    r = c.execute("SELECT * FROM reporte WHERE id=?", (limpiar(obj,"id",50),)).fetchone()
    if not r or not hmac.compare_digest(r["llave"], firma(limpiar(obj,"clave",100))):
        raise ValueError("La clave de este reporte no es válida.")
    return r

def publicar(c,obj):
    tipo = limpiar(obj,"tipo",12)
    desc = limpiar(obj,"descripcion",600)
    zona = limpiar(obj,"zona",100)
    fecha = date.fromisoformat(limpiar(obj,"fecha",10))
    if tipo not in ("perdido","encontrado") or not zona or fecha>date.today(): raise ValueError("Revisa el tipo, el lugar y la fecha.")
    foto = limpiar(obj,"foto",4_000_000)
    if not foto and len(desc)<4: raise ValueError("Agrega una foto o una descripción más completa.")
    mini = pie = ""
    with inferencia:
        if foto:
            raw = base64.b64decode(foto,validate=True)
            with Image.open(io.BytesIO(raw)) as im:
                if im.width*im.height > Image.MAX_IMAGE_PIXELS: raise ValueError("La imagen es demasiado grande.")
                vista=ImageOps.exif_transpose(im).convert("RGB")
                pie=modelos.describir(vista)
                vista.thumbnail((400,400))
                buff=io.BytesIO()
                vista.save(buff,format="JPEG",quality=78)
                mini=base64.b64encode(buff.getvalue()).decode()
        if not desc and not pie: raise ValueError("Agrega una descripción del objeto.")
        partes=[modelos.vector(t)*peso for t,peso in [(desc,2),(pie,1)] if t]
        vector=sum(partes)
        vector=(vector/max(np.linalg.norm(vector),1e-9)).astype(np.float32)
    clave=secrets.token_urlsafe(24)
    uid=secrets.token_hex(8)
    c.execute("INSERT INTO reporte VALUES (?,?,?,?,?,?,?,?,?,1)",(uid,tipo,desc,zona,fecha.isoformat(),pie,mini,vector.tobytes(),firma(clave)))
    return {"id":uid,"clave":clave}

def candidatos(c,r):
    v=np.frombuffer(r["vector"],np.float32)
    items=[]
    for otro in c.execute("SELECT * FROM reporte WHERE abierto=1 AND tipo<>?",(r["tipo"],)):
        distancia=abs((date.fromisoformat(r["fecha"])-date.fromisoformat(otro["fecha"])).days)
        sem=float(v @ np.frombuffer(otro["vector"],np.float32))
        if sem<0.32: continue
        puntaje=sem + 0.035*(r["zona"].casefold()==otro["zona"].casefold()) + 0.025/(1+distancia)
        items.append((puntaje,{k:otro[k] for k in ("id","descripcion","zona","fecha","miniatura","pie")}))
    return [item for _,item in sorted(items,key=lambda par:par[0],reverse=True)[:5]]

def accion(ruta,obj):
    with conectar() as c:
        if ruta=="/api/publicar": return publicar(c,obj)
        r=propio(c,obj)
        if ruta=="/api/ver":
            msgs=c.execute("SELECT origen,destino,texto FROM mensaje WHERE destino=? OR origen=? ORDER BY id",(r["id"],r["id"]))
            return {"tipo":r["tipo"],"descripcion":r["descripcion"],"pie":r["pie"],"abierto":bool(r["abierto"]),
                    "candidatos":candidatos(c,r) if r["abierto"] else [], "mensajes":[dict(m) for m in msgs]}
        if ruta=="/api/cerrar":
            c.execute("UPDATE reporte SET abierto=0 WHERE id=?",(r["id"],))
            return {"ok":True}
        if ruta=="/api/mensaje":
            dest=limpiar(obj,"destino",50)
            texto=limpiar(obj,"texto",500)
            otro=c.execute("SELECT tipo,abierto FROM reporte WHERE id=?",(dest,)).fetchone()
            if not otro or otro["tipo"]==r["tipo"] or not otro["abierto"] or not r["abierto"] or not texto:
                raise ValueError("Ambos reportes deben estar abiertos y el mensaje debe contener texto.")
            c.execute("INSERT INTO mensaje(origen,destino,texto) VALUES(?,?,?)",(r["id"],dest,texto))
            return {"ok":True}
        raise ValueError("Acción desconocida.")

class Web(BaseHTTPRequestHandler):
    def responder(self,estado,tipo,datos):
        self.send_response(estado); self.send_header("Content-Type",tipo); self.send_header("Cache-Control","no-store")
        self.send_header("Content-Length",str(len(datos)));self.end_headers();self.wfile.write(datos)
    def do_GET(self):
        if self.path.split("?")[0] in ("/","/index.html"):
            return self.responder(200,"text/html; charset=utf-8",(ROOT/"index.html").read_bytes())
        self.send_error(404)
    def do_POST(self):
        try:
            n=int(self.headers.get("Content-Length","0"))
            if not 0<n<4_200_000: raise ValueError("El archivo supera el límite.")
            obj=json.loads(self.rfile.read(n))
            if not isinstance(obj,dict): raise ValueError("Petición inválida.")
            data=accion(self.path,obj); status=200
        except (ValueError, OSError, UnidentifiedImageError, Image.DecompressionBombError):
            data={"error":"Revisa los datos, el formato de la imagen y la clave del reporte."};status=400
        self.responder(status,"application/json",json.dumps(data).encode())

if __name__=="__main__":
    preparar(); modelos=Modelos(); iniciar()
    port=int(os.environ.get("PORT","5180"))
    print(f"Hallazgos listo en http://localhost:{port}",flush=True)
    ThreadingHTTPServer((os.environ.get("HOST","127.0.0.1"),port),Web).serve_forever()
