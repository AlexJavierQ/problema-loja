import sys,tempfile,os,base64,io,re,unicodedata
from pathlib import Path
from time import perf_counter
import statistics,json
sys.path.insert(0,str(Path(__file__).resolve().parent))
import servidor as s
from PIL import Image
tmp=tempfile.TemporaryDirectory();s.DB=os.path.join(tmp.name,'prueba.sqlite');s.modelos=s.Modelos();s.iniciar()
b=io.BytesIO();Image.open(Path(__file__).with_name('taza-prueba.jpg')).save(b,format='JPEG',quality=80)
def pub(t,d,f=''):
 return s.accion('/api/publicar',dict(tipo=t,descripcion=d,foto=f,zona='Centro',fecha='2026-11-20'))
refs=['','Mochila verde de tela','Juego de llaves con aro metálico','Audífonos negros de diadema','Botella térmica azul de acero','Bolso negro con dos asas','Lentes oscuros de marco redondo','Reloj de pulsera con correa café']
ids=[pub('encontrado',d,base64.b64encode(b.getvalue()).decode() if i==0 else '')['id'] for i,d in enumerate(refs)]
queries=['Perdí una taza de café','Mi morral verde de tela','Se me perdió mi llavero de metal','Unos auriculares negros grandes','Mi termo azul para el agua','Una cartera negra con asas','Mis gafas de sol redondas','Mi reloj de cuero marrón','Un paraguas amarillo plegable','Un libro de álgebra','Mi pelota de fútbol','Una bufanda roja de lana']
def words(x):
 return set(re.findall(r'[a-z]+',unicodedata.normalize('NFKD',x.lower()).encode('ascii','ignore').decode()))-set('a de del mi me con el los se una un para unos en'.split())

tiempos=[]
por_caso=[]
for ronda in range(5):
 for i,q in enumerate(queries):
  inicio=perf_counter()
  r=pub('perdido',q)
  result=[ids.index(c['id']) for c in s.accion('/api/ver',r)['candidatos']]
  tiempos.append(1000*(perf_counter()-inicio))
  if ronda==0: por_caso.append(result)
print(json.dumps(dict(candidatos=por_caso,media_ms=statistics.mean(tiempos),mediana_ms=statistics.median(tiempos),min_ms=min(tiempos),max_ms=max(tiempos),n=len(tiempos)),indent=2))
