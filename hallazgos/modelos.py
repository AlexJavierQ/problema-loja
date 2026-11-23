"""Descarga e inferencia local de los dos modelos de la demostración."""
import os
import urllib.request
from pathlib import Path
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps
from tokenizers import Tokenizer

CACHE = Path(os.environ.get("HALLA_MODELOS", Path.home() / ".cache" / "hallazgos"))
ARCHIVOS = {
    "encoder.onnx": ("Xenova/vit-gpt2-image-captioning", "077550ae0729f9af280c9d885ea9b0380fc8e815", "onnx/encoder_model_quantized.onnx"),
    "decoder.onnx": ("Xenova/vit-gpt2-image-captioning", "077550ae0729f9af280c9d885ea9b0380fc8e815", "onnx/decoder_model_quantized.onnx"),
    "vision.json": ("Xenova/vit-gpt2-image-captioning", "077550ae0729f9af280c9d885ea9b0380fc8e815", "tokenizer.json"),
    "texto.onnx": ("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2", "e8f8c211226b894fcb81acc59f3b34ba3efd5f42", "onnx/model_quint8_avx2.onnx"),
    "texto.json": ("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2", "e8f8c211226b894fcb81acc59f3b34ba3efd5f42", "tokenizer.json"),
}

def preparar():
    CACHE.mkdir(parents=True, exist_ok=True)
    for nombre, (repo, rev, ruta) in ARCHIVOS.items():
        target = CACHE / nombre
        if not target.exists():
            print("Descargando", nombre, flush=True)
            tmp = target.with_suffix(".part")
            urllib.request.urlretrieve(f"https://huggingface.co/{repo}/resolve/{rev}/{ruta}", tmp)
            tmp.replace(target)

class Modelos:
    def __init__(self):
        opciones = ort.SessionOptions()
        opciones.intra_op_num_threads = 2
        def sesion(nombre):
            return ort.InferenceSession(str(CACHE / nombre), opciones, providers=["CPUExecutionProvider"])
        self.encoder = sesion("encoder.onnx")
        self.decoder = sesion("decoder.onnx")
        self.texto = sesion("texto.onnx")
        self.vocab = Tokenizer.from_file(str(CACHE / "vision.json"))
        self.tokens = Tokenizer.from_file(str(CACHE / "texto.json"))
        self.tokens.enable_truncation(max_length=128)

    def describir(self, imagen):
        rgb = ImageOps.exif_transpose(imagen).convert("RGB").resize((224,224), Image.Resampling.BILINEAR)
        pixels = (np.asarray(rgb, dtype=np.float32) / 127.5 - 1).transpose(2,0,1)[None]
        memoria = self.encoder.run(None, {"pixel_values": pixels})[0]
        ids = [50256]
        for _ in range(24):
            logits = self.decoder.run(["logits"], {"encoder_hidden_states": memoria, "input_ids": np.array([ids],dtype=np.int64)})[0]
            siguiente = int(logits[0,-1].argmax())
            if siguiente == 50256: break
            ids.append(siguiente)
        return self.vocab.decode(ids[1:]).strip()

    def vector(self, descripcion):
        ids = np.array([self.tokens.encode(descripcion).ids], dtype=np.int64)
        datos = {"input_ids":ids, "attention_mask":np.ones_like(ids), "token_type_ids":np.zeros_like(ids)}
        out = self.texto.run(None, {t.name:datos[t.name] for t in self.texto.get_inputs()})[0]
        v = out[0].mean(axis=0) if out.ndim == 3 else out[0]
        return v / max(np.linalg.norm(v), 1e-9)

if __name__ == "__main__":
    preparar()
