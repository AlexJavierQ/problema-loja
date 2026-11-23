// Hoja inferior que sigue al dedo 1:1, hereda la velocidad al soltar,
// decide a dónde va proyectando el impulso y se puede volver a agarrar en pleno movimiento.
import { Spring, project, rubberband, reduceMotion } from "./spring.js";

export class Sheet {
  constructor(layer, { onClosed } = {}) {
    this.layer = layer;
    this.scrim = layer.querySelector(".scrim");
    this.panel = layer.querySelector(".sheet");
    this.handle = layer.querySelector(".sheet-drag");
    this.title = layer.querySelector(".sheet-title");
    this.body = layer.querySelector(".sheet-body");
    this.fondo = document.getElementById("app");
    this.onClosed = onClosed;
    this.isOpen = false;
    this.height = 0;
    this.trigger = null;
    this.muestras = [];

    this.spring = new Spring({
      onUpdate: (y) => this._paint(y),
      onRest: (y) => {
        if (y >= this.height - 1 && !this.isOpen) this._hide();
      },
    });

    this.handle.addEventListener("pointerdown", (e) => this._down(e));
    this.handle.addEventListener("pointermove", (e) => this._move(e));
    this.handle.addEventListener("pointerup", (e) => this._up(e));
    this.handle.addEventListener("pointercancel", (e) => this._up(e));
    this.scrim.addEventListener("click", () => this.close());
    layer.querySelector("[data-close]").addEventListener("click", () => this.close());
    layer.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
  }

  open({ title, html, trigger } = {}) {
    this.trigger = trigger || document.activeElement;
    this.title.textContent = title || "";
    this.body.innerHTML = html || "";
    this.body.scrollTop = 0;
    this.layer.hidden = false;
    this.isOpen = true;
    this.fondo?.setAttribute("inert", "");
    this.height = this.panel.offsetHeight;

    if (reduceMotion()) {
      this.spring.set(0);
      this.layer.classList.add("is-fading");
      requestAnimationFrame(() => this.layer.classList.add("is-visible"));
    } else {
      // Si estaba cerrándose, sale desde donde quedó; si no, desde abajo.
      if (!this.spring.moving) this.spring.set(this.height);
      this.spring.to(0, { damping: 1, response: 0.42 });
    }
    this.panel.focus({ preventScroll: true });
  }

  close({ velocity = 0 } = {}) {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.fondo?.removeAttribute("inert");
    if (reduceMotion()) {
      this.layer.classList.remove("is-visible");
      setTimeout(() => this._hide(), 200);
      return;
    }
    this.spring.to(this.height, { velocity, damping: 1, response: 0.36 });
  }

  _hide() {
    this.layer.hidden = true;
    this.layer.classList.remove("is-fading", "is-visible");
    if (this.fondo) this.fondo.style.transform = "";
    this.trigger?.focus?.({ preventScroll: true });
    this.onClosed?.();
  }

  _paint(y) {
    const avance = this.height ? Math.min(Math.max(1 - y / this.height, 0), 1) : 1;
    this.panel.style.transform = `translate3d(0, ${y}px, 0)`;
    this.scrim.style.opacity = String(avance);
    // El fondo retrocede un poco: la hoja es una tarea aparte.
    if (this.fondo) this.fondo.style.transform = avance > 0.001 ? `scale(${1 - 0.02 * avance})` : "";
  }

  _down(e) {
    if (!e.isPrimary || e.target.closest("[data-close]")) return;
    this.handle.setPointerCapture(e.pointerId);
    this.spring.stop(); // interrumpe lo que estuviera animando y sigue desde ahí
    this.dragging = true;
    this.agarre = e.clientY - this.spring.value; // respeta el punto donde se agarró
    this.muestras = [{ t: e.timeStamp, y: this.spring.value }];
    this.height = this.panel.offsetHeight;
    this.handle.classList.add("is-dragging");
  }

  _move(e) {
    if (!this.dragging) return;
    let y = e.clientY - this.agarre;
    if (y < 0) y = -rubberband(-y, this.height); // hacia arriba cede, no se traba
    this.spring.value = y;
    this._paint(y);
    this.muestras.push({ t: e.timeStamp, y });
    while (this.muestras.length > 2 && e.timeStamp - this.muestras[0].t > 100) this.muestras.shift();
  }

  _up(e) {
    if (!this.dragging) return;
    this.dragging = false;
    this.handle.classList.remove("is-dragging");
    const a = this.muestras[0];
    const b = this.muestras[this.muestras.length - 1];
    const dt = (b.t - a.t) / 1000;
    const quieto = e.timeStamp - b.t > 80; // se detuvo antes de soltar
    const velocidad = dt > 0 && !quieto ? (b.y - a.y) / dt : 0;
    const destino = this.spring.value + project(velocidad);
    const lanzado = Math.abs(velocidad) > 250;

    if (destino > this.height * 0.5) {
      this.isOpen = false;
      this.fondo?.removeAttribute("inert");
      this.spring.to(this.height, { velocity: velocidad, damping: 1, response: 0.34 });
    } else {
      // Solo rebota si el gesto traía impulso.
      this.spring.to(0, { velocity: velocidad, damping: lanzado ? 0.8 : 1, response: 0.3 });
    }
  }
}
