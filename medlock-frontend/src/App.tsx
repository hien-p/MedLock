import { useEffect, useRef } from "react";
import { SuiWalletPanel } from "./components/SuiWalletPanel";

const useScrollReveal = () => {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.1 },
    );

    const elements = document.querySelectorAll(".scroll-reveal");
    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);
};

const useDraggableAlert = (ref: React.RefObject<HTMLDivElement | null>) => {
  useEffect(() => {
    if (typeof window === "undefined" || !("PointerEvent" in window)) {
      return;
    }

    const element = ref.current;
    if (!element) return;

    let isDragging = false;
    let initialX = 0;
    let initialY = 0;
    let xOffset = 0;
    let yOffset = 0;

    const setTranslate = (xPos: number, yPos: number) => {
      element.style.transform = `translate(${xPos}px, ${yPos}px) rotate(-5deg)`;
    };

    const dragStart = (event: PointerEvent) => {
      if (!event.target || !element.contains(event.target as Node)) return;
      isDragging = true;
      initialX = event.clientX - xOffset;
      initialY = event.clientY - yOffset;
      element.style.cursor = "grabbing";
      element.style.userSelect = "none";
    };

    const dragEnd = () => {
      isDragging = false;
      element.style.cursor = "move";
      element.style.userSelect = "auto";
    };

    const drag = (event: PointerEvent) => {
      if (!isDragging) return;
      event.preventDefault();
      xOffset = event.clientX - initialX;
      yOffset = event.clientY - initialY;
      setTranslate(xOffset, yOffset);
    };

    element.addEventListener("pointerdown", dragStart);
    window.addEventListener("pointerup", dragEnd);
    window.addEventListener("pointermove", drag, { passive: false });

    return () => {
      element.removeEventListener("pointerdown", dragStart);
      window.removeEventListener("pointerup", dragEnd);
      window.removeEventListener("pointermove", drag);
    };
  }, [ref]);
};

const marqueeItems = [
  { label: "WALRUS", accent: "" },
  { label: "★", accent: "text-neon-lime" },
  { label: "SEAL", accent: "" },
  { label: "★", accent: "text-neon-pink" },
  { label: "NAUTILUS", accent: "" },
  { label: "★", accent: "text-neon-blue" },
  { label: "ZERO-TRUST COMPUTE", accent: "" },
  { label: "★", accent: "text-neon-lime" },
];

const ColorGrid = () => {
  const swatches = [
    "bg-neon-pink",
    "bg-neon-lime",
    "bg-neon-blue",
    "bg-brand-dark",
    "bg-white",
  ];
  const rows = 24;
  return (
    <section className="scroll-reveal grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12">
      {Array.from({ length: rows }).map((_, index) => {
        const classes = [
          swatches[index % swatches.length],
          "h-24",
          "border-2",
          "border-brand-dark",
          "transition-all",
          "hover:scale-110",
          "hover:z-10",
          index % 3 === 0 ? "hover:shadow-hard-lime" : "",
          index % 3 === 1 ? "hover:shadow-hard-pink" : "",
          index % 3 === 2 ? "hover:shadow-hard-blue" : "",
          index > 7 ? "hidden sm:block" : "",
          index > 11 ? "hidden md:block" : "",
          index > 17 ? "hidden lg:block" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return <div key={index} className={classes} />;
      })}
    </section>
  );
};

function App() {
  const draggableRef = useRef<HTMLDivElement | null>(null);
  useScrollReveal();
  useDraggableAlert(draggableRef);

  return (
    <div className="bg-brand-bg text-brand-dark font-mono overflow-x-hidden">
      <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-60 h-60 md:w-96 md:h-96 bg-neon-lime rounded-full blur-3xl opacity-60 animate-pulse" />
        <div
          className="absolute -bottom-20 -right-20 w-72 h-72 md:w-96 md:h-96 bg-neon-pink rounded-full blur-3xl opacity-60 animate-pulse"
          style={{ animationDelay: "2s" }}
        />

        <img
          src="https://cdn.prod.website-files.com/687615731a76518b8c27cf39/68761ce22a49c0f7365165e8_Group%202147263312%20(1).svg"
          alt="Floating Seal"
          className="absolute top-1/4 left-10 w-24 h-24 opacity-70 z-10 animate-float-1 hidden md:block"
          style={{ animationDelay: "-2s", transform: "rotate(15deg)" }}
        />
        <img
          src="https://cdn.prod.website-files.com/687615731a76518b8c27cf39/68761ce22a49c0f7365165e8_Group%202147263312%20(1).svg"
          alt="Floating Seal"
          className="absolute bottom-1/4 right-10 w-32 h-32 opacity-70 z-10 animate-float-2 hidden md:block"
          style={{ transform: "rotate(-20deg) scaleX(-1)" }}
        />
        <img
          src="https://cdn.prod.website-files.com/6864f039b26f4afedada6bc5/6864f039b26f4afedada6c71_token-ilust3.svg"
          alt="Floating Walrus"
          className="absolute top-1/2 left-1/4 w-28 h-28 opacity-60 z-10 animate-float-2 hidden lg:block"
          style={{ animationDelay: "-5s" }}
        />
        <img
          src="https://cdn.prod.website-files.com/687615731a76518b8c27cf39/68761ce22a49c0f7365165e8_Group%202147263312%20(1).svg"
          alt="Floating Seal"
          className="absolute bottom-10 left-1/3 w-20 h-20 opacity-70 z-10 animate-float-1 md:hidden"
          style={{ transform: "rotate(-10deg)" }}
        />

        <div className="grid grid-cols-1 grid-rows-1 text-center z-10">
          <h1
            className="font-display text-[22vw] lg:text-[250px] text-neon-pink col-start-1 row-start-1"
            style={{ WebkitTextStroke: "2px #111111" }}
          >
            DORKSENSE
          </h1>
          <h1 className="font-display text-[22vw] lg:text-[250px] text-neon-blue col-start-1 row-start-1 translate-x-1 translate-y-1 md:translate-x-2 md:translate-y-2">
            DORKSENSE
          </h1>
        </div>

        <h2 className="font-mono text-lg md:text-2xl mt-4 bg-neon-lime p-2 shadow-hard border-2 border-brand-dark z-10 text-center">
          A Privacy-Preserving AI Workflow
        </h2>

        <a
          href="#content"
          className="absolute bottom-10 font-mono animate-bounce text-2xl z-10 p-2 shadow-hard-sm bg-white border-2 border-brand-dark rounded-full"
          aria-label="Scroll down to content"
        >
          👇
        </a>
      </main>

      <section className="w-full bg-brand-dark text-brand-bg py-6 border-y-4 border-brand-dark overflow-hidden whitespace-nowrap">
        {[0, 1].map((loop) => (
          <div
            key={loop}
            className="inline-block animate-marquee"
            aria-hidden={loop === 1}
          >
            {marqueeItems.map((item, index) => (
              <span
                key={`${loop}-${index}`}
                className={`font-display text-5xl mx-4 ${item.accent}`}
              >
                {item.label}
              </span>
            ))}
          </div>
        ))}
      </section>

      <section id="content" className="container mx-auto p-4 md:p-10 py-16">
        <h2 className="font-display text-5xl md:text-7xl mb-10 text-center scroll-reveal">
          THE ECOSYSTEM
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="scroll-reveal bg-white border-2 border-brand-dark shadow-hard p-6 group hover:bg-neon-lime hover:-translate-y-1 hover:shadow-hard-pink transition-all duration-200">
            <div className="w-full h-32 bg-brand-bg border-2 border-brand-dark shadow-hard-sm rounded-md mb-4 overflow-hidden group-hover:bg-neon-lime transition-all duration-200">
              <img
                src="https://cdn.prod.website-files.com/6864f039b26f4afedada6bc5/6864f039b26f4afedada6c71_token-ilust3.svg"
                alt="Walrus Mascot"
                className="w-full h-full object-contain p-2"
                onError={(event) => {
                  (event.currentTarget as HTMLImageElement).src =
                    "https://placehold.co/400x300/F0F0F0/111111?text=WALRUS";
                }}
                loading="lazy"
              />
            </div>
            <h3 className="font-display text-4xl mb-2">WALRUS</h3>
            <p>
              Decentralized, verifiable blob storage for large data. Acts as the
              AI data backbone, making datasets trustworthy and provable.
            </p>
            <button className="mt-4 bg-brand-dark text-white font-mono px-4 py-2 border-2 border-brand-dark shadow-hard-sm hover:bg-neon-pink hover:text-brand-dark hover:shadow-hard-lime transition-all">
              DATA BACKBONE
            </button>
          </div>

          <div
            className="scroll-reveal bg-white border-2 border-brand-dark shadow-hard p-6 group hover:bg-neon-blue hover:-translate-y-1 hover:shadow-hard-blue transition-all duration-200"
            style={{ transitionDelay: "100ms" }}
          >
            <div className="w-full h-32 bg-brand-bg border-2 border-brand-dark shadow-hard-sm rounded-md mb-4 overflow-hidden group-hover:bg-neon-blue transition-all duration-200">
              <img
                src="https://cdn.prod.website-files.com/687615731a76518b8c27cf39/68761ce22a49c0f7365165e8_Group%202147263312%20(1).svg"
                alt="Seal Mascot"
                className="w-full h-full object-contain p-2"
                onError={(event) => {
                  (event.currentTarget as HTMLImageElement).src =
                    "https://placehold.co/400x300/F0F0F0/111111?text=SEAL";
                }}
                loading="lazy"
              />
            </div>
            <h3 className="font-display text-4xl mb-2">SEAL</h3>
            <p>
              Client-side encryption with programmable, on-chain access control.
              Defines who can decrypt what, for how long, and under which rules.
            </p>
            <button className="mt-4 bg-brand-dark text-white font-mono px-4 py-2 border-2 border-brand-dark shadow-hard-sm hover:bg-neon-pink hover:text-brand-dark hover:shadow-hard-lime transition-all">
              ACCESS CONTROL
            </button>
          </div>

          <div
            className="scroll-reveal bg-white border-2 border-brand-dark shadow-hard p-6 group hover:bg-neon-pink hover:-translate-y-1 hover:shadow-hard-lime transition-all duration-200"
            style={{ transitionDelay: "200ms" }}
          >
            <div className="w-full h-32 bg-brand-bg border-2 border-brand-dark shadow-hard-sm rounded-md mb-4 overflow-hidden group-hover:bg-neon-pink transition-all duration-200">
              <img
                src="https://raw.githubusercontent.com/MystenLabs/sui/main/apps/wallet/assets/sui-logo.png"
                alt="Sui Logo for Nautilus"
                className="w-full h-full object-contain p-2"
                onError={(event) => {
                  (event.currentTarget as HTMLImageElement).src =
                    "https://placehold.co/400x300/F0F0F0/111111?text=NAUTILUS+SUI";
                }}
                loading="lazy"
              />
            </div>
            <h3 className="font-display text-4xl mb-2">NAUTILUS</h3>
            <p>
              Confidential and verifiable computing inside Trusted Execution
              Environments. Run AI models on data that never leaves the enclave.
            </p>
            <button className="mt-4 bg-brand-dark text-white font-mono px-4 py-2 border-2 border-brand-dark shadow-hard-sm hover:bg-neon-pink hover:text-brand-dark hover:shadow-hard-lime transition-all">
              CONFIDENTIAL COMPUTE
            </button>
          </div>
        </div>
      </section>

      <section className="container mx-auto p-4 md:p-10 py-16">
        <div className="scroll-reveal w-full">
          <SuiWalletPanel />
        </div>
      </section>

      <section className="scroll-reveal w-full py-20 px-4 flex items-center justify-center bg-neon-blue border-y-4 border-brand-dark relative min-h-[400px]">
        <h2 className="font-display text-5xl md:text-8xl text-center">
          THIS IS INTENTIONAL.
        </h2>
        <div
          ref={draggableRef}
          className="absolute top-1/2 left-1/2 w-72 bg-neon-lime border-4 border-brand-dark shadow-hard-pink p-4 cursor-move"
          style={{ transform: "translate(0px, 0px) rotate(-5deg)" }}
        >
          <h4 className="font-display text-xl border-b-2 border-brand-dark mb-2">
            SYSTEM ALERT! (DRAG ME)
          </h4>
          <p className="text-sm">
            This workflow ensures sensitive fMRI data is encrypted at the source
            and only decrypted within a trusted TEE for AI inference.
          </p>
          <div className="text-xs mt-2 text-right">ZERO-TRUST MODEL</div>
        </div>
      </section>

      <section className="scroll-reveal container mx-auto p-4 md:p-10 py-16 space-y-6">
        <h2 className="font-display text-5xl md:text-7xl mb-10 text-center">
          BENEFITS &amp; COMPLIANCE
        </h2>
        {[
          {
            title: "REGULATORY COMPLIANCE (GDPR/HIPAA)",
            copy:
              "Data is encrypted at rest, in transit, and in use. Fine-grained on-chain policies act as explicit, auditable consent records.",
          },
          {
            title: "USER CONSENT & REVOCABILITY",
            copy:
              "Patients control their data. Access is programmatically tied to consent. Consent can be updated or revoked on-chain, instantly preventing new decryption.",
          },
          {
            title: "ZERO-TRUST CONFIDENTIAL COMPUTE",
            copy:
              "Eliminates the need to trust any single platform. Data is protected by encryption and hardware-backed isolation at every stage. No admin can see plaintext.",
          },
          {
            title: "ACCESS AUDITABILITY & PROVENANCE",
            copy:
              "Every data access and computation is logged on the blockchain. These tamper-proof audit trails enable compliance and trustworthy provenance tracking.",
          },
          {
            title: "CROSS-ORGANIZATION COLLABORATION",
            copy:
              "Facilitates secure data sharing across hospitals and labs without exposing raw data. Teams can share encrypted data and run computations in enclaves.",
          },
        ].map((item, index) => (
          <div
            key={item.title}
            className="bg-white border-2 border-brand-dark shadow-hard p-6 transition-all duration-200 hover:shadow-hard-blue"
            style={{ transitionDelay: `${index * 80}ms` }}
          >
            <h3 className="font-display text-3xl mb-2">{item.title}</h3>
            <p>{item.copy}</p>
          </div>
        ))}
      </section>

      <ColorGrid />

      <footer className="w-full bg-brand-dark text-brand-bg p-10 text-center font-mono">
        <p>© 2025 DORKSENSE. All rights reserved (or not).</p>
        <p>A Privacy-Preserving AI Workflow</p>
      </footer>
    </div>
  );
}

export default App;
