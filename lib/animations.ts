// =============================================
// The Living Grimoire — Animation Utilities
// =============================================
// Shared GSAP + Lenis helpers used across all pages.
// Adapted from dot-portfolio's animation architecture.

"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins (safe to call multiple times)
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// ── Lenis Smooth Scroll ──────────────────────────────────────

let lenisInstance: any = null;

/**
 * Initialize Lenis smooth scroll (singleton).
 * Wires into GSAP ticker for seamless ScrollTrigger integration.
 */
export async function initLenis() {
  if (lenisInstance || typeof window === "undefined") return lenisInstance;

  const { default: Lenis } = await import("lenis");

  lenisInstance = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
  });

  lenisInstance.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time: number) => lenisInstance.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  return lenisInstance;
}

/**
 * Destroy the Lenis instance (for cleanup on unmount).
 */
export function destroyLenis() {
  if (lenisInstance) {
    lenisInstance.destroy();
    lenisInstance = null;
  }
}

// ── Page Enter Animation ─────────────────────────────────────

/**
 * Standard page-enter animation: fade in + slight y-shift.
 */
export function pageEnter(container: HTMLElement) {
  gsap.fromTo(
    container,
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }
  );
}

// ── Scroll-Triggered Reveals ─────────────────────────────────

/**
 * Set up scroll-triggered stagger reveals for elements matching selector.
 * Each element fades in + shifts up as it enters the viewport.
 */
export function revealOnScroll(
  selector: string,
  container?: HTMLElement,
  options?: { stagger?: number; y?: number; duration?: number }
) {
  const { stagger = 0.1, y = 32, duration = 0.6 } = options ?? {};
  const scope = container ?? document;
  const elements = scope.querySelectorAll(selector);

  if (elements.length === 0) return;

  gsap.set(elements, { opacity: 0, y });

  ScrollTrigger.batch(elements, {
    onEnter: (batch) => {
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration,
        stagger,
        ease: "power2.out",
      });
    },
    start: "top 88%",
    once: true,
  });
}

// ── Stagger Reveal (Immediate) ───────────────────────────────

/**
 * Immediately stagger-reveal elements (no scroll trigger).
 * Good for above-the-fold hero content.
 */
export function staggerReveal(
  elements: HTMLElement[] | NodeListOf<Element>,
  options?: { stagger?: number; y?: number; duration?: number; delay?: number }
) {
  const { stagger = 0.08, y = 20, duration = 0.6, delay = 0.1 } = options ?? {};

  gsap.fromTo(
    elements,
    { opacity: 0, y },
    { opacity: 1, y: 0, duration, stagger, delay, ease: "power2.out" }
  );
}

// ── Wizard Step Transition ───────────────────────────────────

/**
 * Animate a wizard step transition (old exits, new enters).
 */
export function wizardTransition(
  outgoing: HTMLElement | null,
  incoming: HTMLElement,
  direction: "forward" | "backward" = "forward"
) {
  const xOut = direction === "forward" ? -30 : 30;
  const xIn = direction === "forward" ? 30 : -30;

  const tl = gsap.timeline();

  if (outgoing) {
    tl.to(outgoing, {
      opacity: 0,
      x: xOut,
      duration: 0.25,
      ease: "power2.in",
    });
  }

  tl.fromTo(
    incoming,
    { opacity: 0, x: xIn },
    { opacity: 1, x: 0, duration: 0.35, ease: "power2.out" }
  );

  return tl;
}

// ── Export GSAP + ScrollTrigger for direct usage ──────────────

export { gsap, ScrollTrigger };
