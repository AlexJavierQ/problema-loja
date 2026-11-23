// Resorte con los dos parámetros que usa Apple para diseñar movimiento:
// razón de amortiguamiento (1 = sin rebote) y respuesta en segundos.
// Siempre parte del valor que está en pantalla y conserva la velocidad,
// así que cualquier animación se puede interrumpir o redirigir a mitad de camino.

export class Spring {
  constructor({ value = 0, damping = 1, response = 0.38, precision = 0.5, onUpdate, onRest } = {}) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.precision = precision;
    this.onUpdate = onUpdate;
    this.onRest = onRest;
    this._raf = 0;
    this._last = 0;
    this._tick = this._tick.bind(this);
    this.configure(damping, response);
  }

  configure(damping = 1, response = 0.38) {
    this.stiffness = (2 * Math.PI / response) ** 2; // masa = 1
    this.friction = (4 * Math.PI * damping) / response;
  }

  get moving() {
    return this._raf !== 0;
  }

  // Cambia el destino sin tocar posición ni velocidad actuales.
  to(target, { velocity, damping, response } = {}) {
    if (damping !== undefined || response !== undefined) this.configure(damping, response);
    if (velocity !== undefined) this.velocity = velocity;
    this.target = target;
    if (!this._raf) {
      this._last = performance.now();
      this._raf = requestAnimationFrame(this._tick);
    }
  }

  // El dedo toma el control: el resorte se queda donde está.
  stop() {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  set(value) {
    this.stop();
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.onUpdate?.(value);
  }

  _tick(now) {
    const dt = Math.min((now - this._last) / 1000, 1 / 30);
    this._last = now;
    const pasos = Math.max(1, Math.ceil(dt * 240));
    const h = dt / pasos;
    for (let i = 0; i < pasos; i++) {
      const aceleracion = -this.stiffness * (this.value - this.target) - this.friction * this.velocity;
      this.velocity += aceleracion * h;
      this.value += this.velocity * h;
    }
    const quieto =
      Math.abs(this.velocity) < this.precision * 2 && Math.abs(this.value - this.target) < this.precision;
    if (quieto) {
      this.value = this.target;
      this.velocity = 0;
      this._raf = 0;
      this.onUpdate?.(this.value);
      this.onRest?.(this.value);
      return;
    }
    this.onUpdate?.(this.value);
    this._raf = requestAnimationFrame(this._tick);
  }
}

// Dónde terminaría el gesto si siguiera con su impulso (misma curva del scroll).
export function project(velocity, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

// Resistencia progresiva al pasar un límite: el borde cede en vez de frenar en seco.
export function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
