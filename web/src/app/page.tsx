"use client";

import React, { useState, useEffect, useRef } from "react";

// Intersection Observer Reveal Component for Scroll Animations
function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-1000 ease-out`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(25px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  // Live Activity Ticker State
  const [eventIndex, setEventIndex] = useState(0);
  const [fadeClass, setFadeClass] = useState("opacity-100 translate-y-0");

  // Ajo Circle Interactive State
  const [selectedMember, setSelectedMember] = useState(2); // Bayo by default
  const [isAutoCycle, setIsAutoCycle] = useState(true);

  // Payout Calculator State
  const [calcContribution, setCalcContribution] = useState(50000); // ₦50,000
  const [calcMembers, setCalcMembers] = useState(8);
  const [calcTier, setCalcTier] = useState<"Gold" | "Silver" | "Bronze">("Gold");

  const liveEvents = [
    "⚡ Live: Amina Bello contributed ₦50,000 to Wuse Cooperative Circle",
    "🎉 Payout: David Cole received ₦400,000 via Wema Bank auto-settlement",
    "📈 Trust: Kazim Alao's Reliability Score rose to 98 after a timely payment",
    "✨ New Circle: 'Lagos Tech Savings' created by Uche with 10 slots",
    "⚡ Live: Chioma Nnaji contributed ₦25,000 to Kaduna Friday Circle",
    "🎉 Payout: Funmi Ajayi received ₦300,000 via Wema Bank auto-settlement",
    "📈 Trust: Grace Uzo's Reliability Score increased to 100"
  ];

  const membersData = [
    { id: 0, label: "Uche", status: "paid", amount: "₦50,000", score: 100, cycle: "Cycle 3 of 8", date: "Paid 2h ago", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80" },
    { id: 1, label: "Amina", status: "paid", amount: "₦50,000", score: 98, cycle: "Cycle 3 of 8", date: "Paid 5h ago", img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=80&h=80&q=80" },
    { id: 2, label: "Bayo", status: "active", amount: "₦50,000", score: 95, cycle: "Payout Active", date: "Payout pending", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80" },
    { id: 3, label: "Chioma", status: "pending", amount: "₦50,000", score: 92, cycle: "Cycle 3 of 8", date: "Due in 1d", img: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=80&h=80&q=80" },
    { id: 4, label: "David", status: "pending", amount: "₦50,000", score: 88, cycle: "Cycle 3 of 8", date: "Due in 1d", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80&q=80" },
    { id: 5, label: "Efe", status: "pending", amount: "₦50,000", score: 100, cycle: "Cycle 3 of 8", date: "Due in 1d", img: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=80&h=80&q=80" },
    { id: 6, label: "Funmi", status: "pending", amount: "₦50,000", score: 94, cycle: "Cycle 3 of 8", date: "Due in 1d", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&h=80&q=80" },
    { id: 7, label: "Grace", status: "pending", amount: "₦50,000", score: 97, cycle: "Cycle 3 of 8", date: "Due in 1d", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80" }
  ];

  const stepsData = [
    {
      title: "Build the Circle",
      desc: "Admin configures the group size, cycle frequency (weekly/monthly), contribution amount, and slot orders.",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      title: "Invite the Group",
      desc: "Send unique circle links to members. Joining participants verify identity checks and set payout banks via Nomba.",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      )
    },
    {
      title: "Contribute Savings",
      desc: "Members pay automatically using cards/USSD via Nomba Checkout or direct transfer to dynamic virtual accounts.",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
    {
      title: "Automated Payouts",
      desc: "Once contribution cycles close, Qova pushes the collected pot directly to the recipient's bank via Nomba transfers.",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      )
    }
  ];

  const faqData = [
    {
      q: "What is an Ajo / Esusu circle?",
      a: "An Ajo (or Esusu) is a traditional rotating savings and credit association (ROSCA) common in West Africa. A group of trusted individuals contribute a fixed amount regularly (weekly or monthly), and the total collected amount (the pot) is paid out to one member each cycle until everyone has received the payout once."
    },
    {
      q: "How does Qova automate payouts?",
      a: "Qova integrates Nomba's Transfer API. When all contributions for a cycle are paid, the platform automatically triggers a bank transfer of the total pot directly to the designated recipient's bank account, eliminating manual collection delays."
    },
    {
      q: "What is the Reliability Score?",
      a: "The Reliability Score is a trust metric out of 100 visible to circle members. Contributing on time preserves your score, while late (-5) or missed (-15) contributions lower it. Admins use this score to evaluate invitations, incentivizing timely payments."
    },
    {
      q: "How are payments securely processed?",
      a: "All card and bank transfer contributions are handled securely via Nomba Checkout and Dynamic Virtual Accounts. Qova never stores your banking credentials; we use server-side webhook signatures and transaction status queries to verify transactions."
    }
  ];

  // Auto-advance step indicator
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Live Activity Ticker Interval (Slide Up Transition)
  useEffect(() => {
    const timer = setInterval(() => {
      setFadeClass("opacity-0 -translate-y-2");
      setTimeout(() => {
        setEventIndex((prev) => (prev + 1) % liveEvents.length);
        setFadeClass("opacity-0 translate-y-2");
        setTimeout(() => {
          setFadeClass("opacity-100 translate-y-0");
        }, 50);
      }, 400);
    }, 3800);
    return () => clearInterval(timer);
  }, [liveEvents.length]);

  // Ajo Circle auto-cycle (if user is not actively interacting)
  useEffect(() => {
    if (!isAutoCycle) return;
    const timer = setInterval(() => {
      setSelectedMember((prev) => (prev + 1) % 8);
    }, 4000);
    return () => clearInterval(timer);
  }, [isAutoCycle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setEmail("");
    }
  };

  const handleMemberClick = (id: number) => {
    setIsAutoCycle(false);
    setSelectedMember(id);
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  // Payout Calculator Maths
  const feePercentages = { Gold: 0.5, Silver: 1.0, Bronze: 1.5 };
  const totalPot = calcContribution * calcMembers;
  const platformFee = (totalPot * feePercentages[calcTier]) / 100;
  const netPayout = totalPot - platformFee;

  const currentMemberObj = membersData[selectedMember];

  return (
    <div className="min-h-screen bg-canvas text-ink selection:bg-forest/10 selection:text-forest flex flex-col font-sans relative">

      {/* 1. Live Activity Ticker (The Qova Pulse) */}
      <div className="w-full bg-forest text-canvas text-xs font-semibold py-2.5 px-6 flex justify-center items-center overflow-hidden border-b border-white/5 relative z-50">
        <div className="max-w-7xl w-full flex justify-between items-center">
          <span className="hidden sm:inline-block uppercase tracking-wider text-[10px] bg-emerald px-2 py-0.5 rounded font-bold mr-4 shrink-0">System Pulse</span>
          <div className="flex-1 flex justify-center sm:justify-start overflow-hidden">
            <div className={`transition-all duration-300 transform ${fadeClass} font-mono text-center sm:text-left`}>
              {liveEvents[eventIndex]}
            </div>
          </div>
          <span className="hidden md:inline-block text-[10px] text-canvas/60 font-mono">Nomba Integration Live</span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 md:py-28 overflow-hidden border-b border-forest/5 animate-fade-in-up">

        {/* Floating Background Mesh Glows */}
        <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-glow-forest rounded-full -z-10 animate-drift" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-glow-emerald rounded-full -z-10 animate-drift" style={{ animationDelay: '-10s' }} />

        {/* Subtle Background Print ( Nigerians connecting ) with Zoom-Fade entry */}
        <div
          className="absolute inset-0 opacity-[0.04] bg-cover bg-center pointer-events-none -z-20 animate-zoom-fade"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1531206715517-5c161743ede5?auto=format&fit=crop&w=1600&q=80")' }}
        />

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 self-start bg-emerald/10 text-emerald px-3 py-1.5 rounded-full text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-ping" />
              DevCareer × Nomba Hackathon 2026 Submission
            </div>

            <h1 className="font-serif text-4xl sm:text-7xl font-bold tracking-tight leading-[1.05] text-forest">
              Community Finance, <br />
              <span className="bg-gradient-to-r from-forest to-emerald bg-clip-text text-transparent italic font-normal">Reimagined.</span>
            </h1>

            <p className="text-lg leading-relaxed text-moss max-w-xl">
              Digitalizing the traditional African rotating savings circle (Ajo / Esusu). Track group contributions, automate cycle payouts, and build a verified financial reputation—without manual spreadsheets or reminder stress.
            </p>

            {/* Waitlist Intake */}
            <div id="waitlist" className="max-w-xl mt-4">
              {submitted ? (
                <div className="bg-emerald/10 border border-emerald/20 text-emerald p-4 rounded-xl text-sm font-semibold flex items-center gap-3 animate-fade-in-up w-fit">
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Welcome to the circle! We will notify you when we go live.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1 bg-white border border-forest/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest transition-all shadow-sm"
                  />
                  <button
                    type="submit"
                    className="bg-forest hover:bg-forest-hover text-canvas px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95 cursor-pointer hover-shine"
                  >
                    Join Waitlist
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Hero Visual: fully interactive Ajo Circle with Dashboard Node */}
          <div className="lg:col-span-5 flex justify-center items-center relative animate-float-slow">
            <div className="relative w-80 h-80 sm:w-96 sm:h-96 rounded-full flex items-center justify-center border border-forest/10 bg-white/40 backdrop-blur-sm shadow-md">

              {/* Outer Radial Ring Lines - slowly spinning */}
              <div className="absolute inset-4 border border-dashed border-forest/15 rounded-full animate-spin-slow" />
              <div className="absolute inset-12 border border-forest/5 rounded-full" />

              {/* Central Information Widget - Dynamically displaying details of the selected member! */}
              <div className="z-10 text-center max-w-[170px] bg-canvas/90 p-4 rounded-2xl shadow-md border border-forest/10 transition-all duration-300">
                <span className="text-[7px] tracking-widest text-moss uppercase font-bold block mb-1">Circle Member</span>
                <div className="font-serif text-sm font-bold text-forest truncate">{currentMemberObj.label}</div>
                <div className="w-full h-px bg-forest/15 my-2" />
                <div className="flex justify-between items-center text-[8px] text-moss mb-1">
                  <span>Trust Score</span>
                  <span className="font-semibold text-emerald">{currentMemberObj.score}/100</span>
                </div>
                <div className="flex justify-between items-center text-[8px] text-moss mb-1">
                  <span>Cycle</span>
                  <span>{currentMemberObj.amount}</span>
                </div>
                <div className="text-[9px] font-semibold text-emerald bg-emerald/10 px-2.5 py-0.5 rounded-full mt-1.5 inline-block uppercase tracking-wider">
                  {currentMemberObj.status === "paid" ? "Paid In" : currentMemberObj.status === "active" ? "Active Payout" : "Pending"}
                </div>
                <span className="text-[7px] text-moss/70 block mt-1.5 italic">{currentMemberObj.date}</span>
              </div>

              {/* Positioned Member Avatars (Interactive selection) */}
              {membersData.map((member, i) => {
                const radius = 140;
                const x = Math.cos((270 + member.id * 45) * Math.PI / 180) * radius;
                const y = Math.sin((270 + member.id * 45) * Math.PI / 180) * radius;
                const isSelected = selectedMember === member.id;

                return (
                  <button
                    key={member.id}
                    onClick={() => handleMemberClick(member.id)}
                    className="absolute flex flex-col items-center group transition-transform focus:outline-none cursor-pointer"
                    style={{
                      transform: `translate(${x}px, ${y}px) ${isSelected ? 'scale(1.15)' : 'scale(1)'}`,
                      zIndex: isSelected ? 30 : 20
                    }}
                  >
                    <div className="relative">
                      {/* Avatar Image container */}
                      <img
                        src={member.img}
                        alt={member.label}
                        className={`w-10 h-10 rounded-full object-cover border-2 shadow-md transition-all duration-300 ${isSelected
                            ? "border-emerald ring-4 ring-emerald/25 scale-110"
                            : member.status === "paid"
                              ? "border-forest hover:border-forest"
                              : member.status === "active"
                                ? "border-emerald ring-2 ring-emerald/10"
                                : "border-forest/20 hover:border-forest/40"
                          }`}
                      />
                      {/* Overlay verification status badge */}
                      {member.status === "paid" && (
                        <div className="absolute -bottom-1 -right-1 bg-forest text-canvas rounded-full p-0.5 border border-white">
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      {member.status === "active" && (
                        <div className="absolute -bottom-1 -right-1 bg-emerald text-canvas rounded-full p-0.5 border border-white">
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <span className="absolute top-11 bg-ink text-canvas text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-40 shadow-md">
                      {member.label} (Score: {member.score})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid (Limit Box Outlines - Borderless Cards) */}
      <section id="features" className="py-24 bg-card/45">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal className="text-center max-w-2xl mx-auto mb-20 flex flex-col gap-4">
            <h2 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-forest">
              Modern Trust Infrastructure
            </h2>
            <p className="text-moss">
              Built on traditional social dynamics but updated with automated integrations to keep group savings secure, transparent, and prompt.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Feature 1 */}
            <Reveal delay={0} className="flex flex-col gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-forest/5 flex items-center justify-center text-forest transition-all duration-300 group-hover:bg-forest/10 group-hover:scale-105">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-serif text-xl font-bold text-forest transition-colors duration-300 group-hover:text-emerald">Automated Payouts</h3>
              <p className="text-sm leading-relaxed text-moss">
                No more chasing administrators for payouts. Qova triggers instant bank settlement via Nomba Transfers the moment a cycle completes.
              </p>
            </Reveal>

            {/* Feature 2 */}
            <Reveal delay={150} className="flex flex-col gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-forest/5 flex items-center justify-center text-forest transition-all duration-300 group-hover:bg-forest/10 group-hover:scale-105">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-serif text-xl font-bold text-forest transition-colors duration-300 group-hover:text-emerald">Reliability Score</h3>
              <p className="text-sm leading-relaxed text-moss">
                Encourage prompt payments with a transparent system. Late contributions deduct points, while timely actions reward credit reputations.
              </p>
            </Reveal>

            {/* Feature 3 */}
            <Reveal delay={300} className="flex flex-col gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-forest/5 flex items-center justify-center text-forest transition-all duration-300 group-hover:bg-forest/10 group-hover:scale-105">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-serif text-xl font-bold text-forest transition-colors duration-300 group-hover:text-emerald">Identity Verification</h3>
              <p className="text-sm leading-relaxed text-moss">
                Keep circles secure. Every participant registers with phone verification and validates account details via Nomba bank lookup prior to joining.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Trust & Reliability Score Section */}
      <section id="trust" className="py-24 border-t border-forest/5">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          {/* Card Mockup representing a premium app screen UI (Flat minimal style) */}
          <div className="lg:col-span-5 flex justify-center">
            <Reveal className="w-full max-w-sm">
              <div className="bg-white border border-forest/10 rounded-2xl p-8 shadow-sm relative overflow-hidden transition-all duration-500 hover:shadow-md hover:border-forest/20 group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-forest/5 rounded-bl-full transition-transform duration-700 group-hover:scale-110" />

                <div className="flex items-center gap-4 mb-6">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80"
                    alt="Kazim Alao portrait avatar"
                    className="w-12 h-12 rounded-full object-cover border border-forest/10 shadow-sm transition-transform duration-500 group-hover:scale-105"
                  />
                  <div>
                    <h4 className="font-serif font-bold text-forest text-base">Kazim Alao</h4>
                    <p className="text-xs text-moss">Active Member since April 2026</p>
                  </div>
                </div>

                <div className="bg-canvas border border-forest/5 rounded-xl p-5 mb-6 text-center shadow-inner">
                  <span className="text-[10px] text-moss uppercase tracking-widest font-bold">Reliability score</span>
                  <div className="font-serif text-5xl font-bold text-forest mt-1.5 transition-all duration-300 group-hover:text-emerald">95<span className="text-lg text-moss">/100</span></div>
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald/10 text-emerald animate-pulse">
                    <svg className="w-3.5 h-3.5 text-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    High Trust Grade
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-moss">Circles Completed</span>
                    <span className="font-semibold text-forest">4 Groups</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-moss">Timely Payments</span>
                    <span className="font-semibold text-emerald">32 (+5 each)</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-moss">Late Payments</span>
                    <span className="font-semibold text-rose-600">1 (-5 each)</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-moss">BVN Verification</span>
                    <span className="font-semibold text-forest">Verified</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-6">
            <Reveal className="flex flex-col gap-4">
              <div className="text-xs uppercase tracking-widest font-bold text-emerald bg-emerald/10 self-start px-3 py-1 rounded-full shadow-sm">Reputation & Accountability</div>
              <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-forest leading-tight">
                An Ajo built on real, transparent credentials
              </h2>
              <p className="text-moss leading-relaxed">
                Traditional Ajo groups survive on mutual trust, but friction occurs when someone defaults or pays late. Qova translates this trust into a digital score, rewarding early contributors and holding late players accountable.
              </p>
            </Reveal>

            {/* Trust Tiers (Minimal Flat) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-2">
              <Reveal delay={0} className="border-t border-forest/15 pt-4 group">
                <span className="text-xs font-semibold text-forest uppercase tracking-wider block transition-colors duration-300 group-hover:text-emerald">Gold (90-100)</span>
                <p className="text-xs text-moss mt-2">Choice of payout priority slot, up to 15 members, 0.5% platform fee.</p>
              </Reveal>
              <Reveal delay={150} className="border-t border-forest/15 pt-4 group">
                <span className="text-xs font-semibold text-moss uppercase tracking-wider block transition-colors duration-300 group-hover:text-forest">Silver (75-89)</span>
                <p className="text-xs text-moss mt-2">Standard group access up to 10 members, 1.0% platform fee.</p>
              </Reveal>
              <Reveal delay={300} className="border-t border-forest/15 pt-4 group">
                <span className="text-xs font-semibold text-[#8C7853] uppercase tracking-wider block transition-colors duration-300 group-hover:text-forest">Bronze (60-74)</span>
                <p className="text-xs text-moss mt-2">Limited to basic groups up to 6 members, 1.5% platform fee.</p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interactive Payout Calculator Section */}
      <section id="calculator" className="py-24 border-t border-forest/5 bg-card/25">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal className="text-center max-w-2xl mx-auto mb-16 flex flex-col gap-4">
            <div className="text-xs uppercase tracking-widest font-bold text-emerald bg-emerald/10 self-start px-3 py-1 rounded-full shadow-sm mx-auto">Financial Simulator</div>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-forest leading-tight">
              Calculate Your Payout Dynamics
            </h2>
            <p className="text-moss">
              Slide options below to see how contributions, member sizing, and your trust tier influence pot size and platform fees.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-stretch">

            {/* Calculator controls - Left */}
            <div className="lg:col-span-6 flex flex-col justify-center gap-8 bg-white border border-forest/10 p-8 rounded-2xl shadow-sm">

              {/* Slider 1: Contribution Amount */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-forest">Cycle Contribution</span>
                  <span className="font-mono text-emerald">₦{calcContribution.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={5000}
                  max={200000}
                  step={5000}
                  value={calcContribution}
                  onChange={(e) => setCalcContribution(Number(e.target.value))}
                  className="w-full accent-forest h-1.5 bg-forest/10 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-moss">Slide to set regular contribution per slot</span>
              </div>

              {/* Slider 2: Member Count */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-forest">Circle Members</span>
                  <span className="font-mono text-emerald">{calcMembers} Slots</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={20}
                  step={1}
                  value={calcMembers}
                  onChange={(e) => setCalcMembers(Number(e.target.value))}
                  className="w-full accent-forest h-1.5 bg-forest/10 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-moss">Set number of members in the savings rotation</span>
              </div>

              {/* Selection 3: Trust Tier (Platform Fee impact) */}
              <div className="flex flex-col gap-3">
                <span className="text-sm font-semibold text-forest">Your Trust Tier (Score Based)</span>
                <div className="grid grid-cols-3 gap-3">
                  {(["Gold", "Silver", "Bronze"] as const).map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setCalcTier(tier)}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${calcTier === tier
                          ? "bg-forest border-forest text-canvas shadow-sm"
                          : "bg-white border-forest/15 text-moss hover:bg-forest/5"
                        }`}
                    >
                      {tier} ({feePercentages[tier]}%)
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-moss">Gold Tier (Score 90+) offers the lowest platform fee structure.</span>
              </div>
            </div>

            {/* Calculations Dashboard output - Right */}
            <div className="lg:col-span-6 flex flex-col justify-between bg-forest text-canvas p-8 rounded-2xl shadow-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full transition-all duration-500 group-hover:scale-105" />

              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest text-canvas/50 font-bold font-mono">Calculated Returns</span>
                <h3 className="font-serif text-2xl font-semibold italic text-emerald-300">Ajo Pot Structure</h3>
              </div>

              <div className="my-8 space-y-5">
                <div className="flex justify-between items-center border-b border-canvas/10 pb-3">
                  <span className="text-canvas/70 text-xs">Total Collected Pot</span>
                  <span className="font-serif text-xl font-bold text-white">₦{totalPot.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-b border-canvas/10 pb-3">
                  <span className="text-canvas/70 text-xs">Platform Service Fee ({feePercentages[calcTier]}%)</span>
                  <span className="font-mono text-sm text-rose-300">- ₦{platformFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-canvas/90 text-sm font-semibold">Net Payout Received</span>
                  <span className="font-serif text-3xl font-bold text-emerald-400">₦{netPayout.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-canvas/80 leading-relaxed">
                🚀 **Nomba Direct Settlement:** When the rotation reaches your slot, the net amount of **₦{netPayout.toLocaleString()}** will be paid out automatically to your bank account via Nomba Bank Transfer.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-card/20 border-t border-forest/5">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal className="text-center max-w-2xl mx-auto mb-16 flex flex-col gap-4">
            <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-forest">Circle Member Stories</h2>
            <p className="text-moss">See how Nigerians are digitizing their group thrift circles with Qova.</p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <Reveal delay={0}>
              <div className="flex flex-col justify-between h-full bg-white/45 p-8 rounded-2xl border border-forest/5 hover:border-forest/10 hover:shadow-md transition-all duration-300 group">
                <p className="text-sm leading-relaxed text-moss italic mb-6">
                  &ldquo;Managing our 10-person weekly Ajo used to be a nightmare of tracking receipts and reminding members on WhatsApp. With Qova, contributions are collected via direct virtual transfer and payouts go straight to our banks. The reliability score has eliminated late payments completely.&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80"
                    alt="Amina Bello avatar"
                    className="w-10 h-10 rounded-full object-cover border border-forest/5 shadow-sm group-hover:scale-105 transition-transform"
                  />
                  <div>
                    <h5 className="font-serif font-bold text-forest text-sm">Amina Bello</h5>
                    <p className="text-[11px] text-moss">Admin, Lagos Thrift Circle</p>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="flex flex-col justify-between h-full bg-white/45 p-8 rounded-2xl border border-forest/5 hover:border-forest/10 hover:shadow-md transition-all duration-300 group">
                <p className="text-sm leading-relaxed text-moss italic mb-6">
                  &ldquo;I was skeptical at first about moving our office Esusu online, but the automatic payout integration with Nomba changed my mind. The money lands in my account the very minute the cycle closes. Highly recommended for any trust-based savings groups.&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-forest text-canvas flex items-center justify-center font-bold text-sm font-serif group-hover:scale-105 transition-transform">
                    T
                  </div>
                  <div>
                    <h5 className="font-serif font-bold text-forest text-sm">Tunde Adeniyi</h5>
                    <p className="text-[11px] text-moss">Member, Shell Co-op Circle</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* How it Works Section (Connected Stepper) */}
      <section id="how-it-works" className="py-24 border-t border-forest/5 bg-card/10 relative">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal className="text-center max-w-2xl mx-auto mb-20 flex flex-col gap-4">
            <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-forest">
              The Rotational Lifecycle
            </h2>
            <p className="text-moss">
              A frictionless rotating cycle that coordinates collections, schedules, and payouts for your savings group. Click a step to inspect.
            </p>
          </Reveal>

          <div className="relative">
            {/* Connected baseline path for desktop */}
            <div className="absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-forest/10 hidden md:block" />

            {/* Active connecting progress bar - dynamically moves as activeStep changes */}
            <div
              className="absolute top-10 left-[12.5%] h-0.5 bg-emerald transition-all duration-[1000ms] ease-out hidden md:block"
              style={{ width: `${(activeStep / 3) * 75}%` }}
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
              {stepsData.map((step, idx) => {
                const isActive = idx === activeStep;
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveStep(idx)}
                    className="flex flex-col items-center md:items-start text-center md:text-left group cursor-pointer"
                  >
                    {/* Step icon holder */}
                    <div className={`w-20 h-20 rounded-full bg-white border flex items-center justify-center mb-6 shadow-sm transition-all duration-500 ${isActive
                        ? "border-emerald scale-110 ring-4 ring-emerald/15 shadow-md shadow-emerald/5"
                        : "border-forest/10 group-hover:scale-105 group-hover:border-forest/20"
                      }`}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-500 ${isActive ? "bg-emerald/10 text-emerald animate-pulse" : "bg-forest/5 text-forest"
                        }`}>
                        {React.cloneElement(step.icon as React.ReactElement<{ className?: string }>, {
                          className: `w-5 h-5 transition-colors duration-500 ${isActive ? "text-emerald" : "text-forest"}`
                        })}
                      </div>
                    </div>

                    <span className={`text-[10px] uppercase tracking-widest font-bold mb-2 transition-colors duration-500 ${isActive ? "text-emerald" : "text-forest/60"
                      }`}>Step 0{idx + 1}</span>
                    <h3 className={`font-serif text-lg font-bold mb-2 transition-colors duration-500 ${isActive ? "text-emerald font-semibold" : "text-forest"
                      }`}>{step.title}</h3>
                    <p className="text-xs leading-relaxed text-moss max-w-xs">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Product Roadmap Section (Alternating Vertical Timeline) */}
      <section id="roadmap" className="py-24 border-t border-forest/5 bg-card/5">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal className="text-center max-w-2xl mx-auto mb-20 flex flex-col gap-4">
            <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-forest">Development Roadmap</h2>
            <p className="text-moss">Our milestones as we expand Qova from hackathon prototype to a full Pan-African community wallet.</p>
          </Reveal>

          <div className="relative">
            {/* Center Timeline axis line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-forest/15 -translate-x-1/2 hidden md:block" />

            <div className="space-y-16 relative z-10">
              {[
                {
                  quarter: "Q3 2026",
                  title: "Pre-MVP Launch",
                  points: [
                    "WhatsApp verification login integration",
                    "Core Express MVC Architecture & MongoDB database schemas",
                    "Nomba Checkout API dynamic collections",
                    "Basic circle administrator dashboard"
                  ],
                  highlight: true,
                  status: "Current Phase"
                },
                {
                  quarter: "Q4 2026",
                  title: "Trust Verification",
                  points: [
                    "Full BVN checks for high-limit accounts",
                    "Reputation scoring tier badges (Gold, Silver, Bronze)",
                    "Locked personal savings vaults with targets",
                    "Termii automated SMS circle billing alerts"
                  ],
                  status: "Up Next"
                },
                {
                  quarter: "Q1 2027",
                  title: "SMEs & Cooperatives",
                  points: [
                    "SME group business collection wallets",
                    "P2P micro-loans within trusted savings circles",
                    "Circle credit history reports for external bank exports",
                    "Automated virtual bank accounts for offline collections"
                  ],
                  status: "Planning"
                },
                {
                  quarter: "Q2 2027",
                  title: "Pan-African Hub",
                  points: [
                    "Multi-currency transfers (NGN, GHS, KES routing)",
                    "Offline USSD dial codes for circle savings",
                    "Production app stores release (iOS/Android native)",
                    "Third-party yield-generating accounts setup"
                  ],
                  status: "Planning"
                }
              ].map((phase, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <div key={idx} className="flex flex-col md:grid md:grid-cols-2 items-center gap-8 md:gap-16 relative">

                    {/* Pulsing Timeline axis node */}
                    <div className="absolute left-1/2 top-8 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-forest hidden md:flex items-center justify-center z-20">
                      {phase.highlight && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-ping" />
                      )}
                    </div>

                    {/* Timeline card with scroll reveal */}
                    <Reveal
                      delay={idx * 100}
                      className={`w-full max-w-md ${isEven ? "md:col-start-1 md:justify-self-end" : "md:col-start-2 md:justify-self-start"
                        }`}
                    >
                      <div className="bg-white border border-forest/10 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-forest/20 transition-all duration-300 group">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-forest bg-forest/5 px-2.5 py-1 rounded-full group-hover:bg-forest/10 transition-colors">{phase.quarter}</span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${phase.highlight ? "bg-emerald/10 text-emerald animate-pulse" : "bg-moss/10 text-moss"
                            }`}>{phase.status}</span>
                        </div>

                        <h4 className="font-serif text-lg font-bold text-forest mb-3 transition-colors duration-300 group-hover:text-emerald">{phase.title}</h4>
                        <ul className="text-xs text-moss space-y-2 list-disc list-inside">
                          {phase.points.map((pt, ptIdx) => (
                            <li key={ptIdx} className="leading-relaxed">{pt}</li>
                          ))}
                        </ul>
                      </div>
                    </Reveal>

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile App Showcase Section */}
      <section className="py-24 border-t border-forest/5 bg-white/40 overflow-hidden relative">
        {/* Decorative mesh glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-glow-emerald rounded-full -z-10 animate-drift" />

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          <div className="lg:col-span-6 flex flex-col gap-6">
            <Reveal className="flex flex-col gap-4">
              <div className="text-xs uppercase tracking-widest font-bold text-emerald bg-emerald/10 self-start px-3 py-1 rounded-full shadow-sm">
                Mobile Showcase
              </div>
              <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-forest leading-tight">
                Your Ajo circles, now on the go
              </h2>
              <p className="text-moss leading-relaxed">
                Take Qova with you anywhere. Our mobile app provides the ultimate companion to manage your rotating savings. Create group circles, monitor participant contributions, track your real-time trust score, and experience the convenience of fully automated cycle payouts.
              </p>
            </Reveal>

            {/* Mobile App Key Value Props */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
              <Reveal delay={100} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-lg bg-emerald/10 text-emerald flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-forest text-sm">Elegant Native Design</h4>
                  <p className="text-xs text-moss mt-1">Sleek, fluid interfaces built natively for iOS and Android.</p>
                </div>
              </Reveal>

              <Reveal delay={200} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-lg bg-emerald/10 text-emerald flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.02 6.02 0 00-4.902-5.903m0 0A3.002 3.002 0 0013 3a3 3 0 00-3 9v3m10 18a3 3 0 01-3 3h-3.098c-.488-1.121-1.637-2-2.902-2s-2.414.879-2.902 2H3a3 3 0 01-3-3V11a9 9 0 019-9v3.098c1.121.488 2 1.637 2 2.902s-.879 2.414-2 2.902V21a6.002 6.002 0 006-6v-3a3 3 0 00-3-3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-forest text-sm">Instant Push Notifications</h4>
                  <p className="text-xs text-moss mt-1">Get notified of payments, incoming collections, and successful payouts.</p>
                </div>
              </Reveal>
            </div>

            {/* Badge Buttons */}
            <Reveal delay={300} className="flex flex-wrap gap-4 mt-6">
              <div className="flex items-center gap-3 bg-forest text-canvas px-5 py-2.5 rounded-xl shadow-sm border border-white/10 hover:bg-forest-hover transition-colors cursor-pointer group hover-shine">
                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C3.79 16.3 3.4 9.9 7.02 9.77c1.37.05 2.18.6 2.92.58 1.13-.02 1.63-.58 3.19-.58 1.54.02 2.37.58 3.25 1.43-3.23 1.9-2.73 6.13.52 7.42-.65 1.58-1.57 3.16-2.58 4.2h.02a28.9 28.9 0 01-1.37-2.54zM12.03 9.4c-.06-2.87 2.18-5.32 4.95-5.4.3 2.95-2.3 5.4-4.95 5.4z" />
                </svg>
                <div className="text-left">
                  <div className="text-[9px] opacity-60 uppercase tracking-wider font-mono">Download on the</div>
                  <div className="text-xs font-semibold">App Store</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-forest text-canvas px-5 py-2.5 rounded-xl shadow-sm border border-white/10 hover:bg-forest-hover transition-colors cursor-pointer group hover-shine">
                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5.25 3.5a1.2 1.2 0 0 0-1.12.83l9.44 9.45 2.65-2.65L5.25 3.5zM3.5 5.25a1.2 1.2 0 0 0-.5 1v11.5a1.2 1.2 0 0 0 .5 1l6.75-6.75L3.5 5.25zM11.25 13.5l6.75 6.75c.35-.25.5-.7.5-1.15a1.2 1.2 0 0 0-.5-1l-6.75-5.6zM18.75 9.75c0-.4-.15-.8-.5-1.05l-5.6 4.7 5.6 5.6c.35-.35.5-.85.5-1.25v-8z" />
                </svg>
                <div className="text-left">
                  <div className="text-[9px] opacity-60 uppercase tracking-wider font-mono">Get it on</div>
                  <div className="text-xs font-semibold">Google Play</div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Dual Mockup Visual */}
          <div className="lg:col-span-6 flex justify-center items-center relative min-h-[420px] sm:min-h-[500px]">
            {/* Elegant Phone Frames side-by-side with staggered elevations */}
            <div className="flex gap-6 sm:gap-8 justify-center items-center w-full max-w-lg">

              {/* Phone 1 */}
              <Reveal delay={100} className="w-[180px] sm:w-[220px] transform hover:scale-105 transition-transform duration-500">
                <div className="bg-forest border-[6px] border-forest rounded-[36px] shadow-2xl overflow-hidden relative aspect-[9/19.5]">
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-forest rounded-full z-20" />
                  <img
                    src="/WhatsApp Image 2026-06-13 at 10.15.31 PM.jpeg"
                    alt="Qova Native App Screen 1"
                    className="w-full h-full object-cover rounded-[28px] relative z-10"
                  />
                </div>
              </Reveal>

              {/* Phone 2 */}
              <Reveal delay={300} className="w-[180px] sm:w-[220px] transform translate-y-8 hover:scale-105 transition-transform duration-500">
                <div className="bg-forest border-[6px] border-forest rounded-[36px] shadow-2xl overflow-hidden relative aspect-[9/19.5]">
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-forest rounded-full z-20" />
                  <img
                    src="/WhatsApp Image 2026-06-13 at 10.15.36 PM.jpeg"
                    alt="Qova Native App Screen 2"
                    className="w-full h-full object-cover rounded-[28px] relative z-10"
                  />
                </div>
              </Reveal>

            </div>
          </div>

        </div>
      </section>

      {/* Infrastructure Section (The Power of Nomba) */}
      <section id="nomba" className="py-24 border-t border-forest/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

            <div className="lg:col-span-5 flex flex-col gap-6">
              <Reveal className="flex flex-col gap-4">
                <span className="text-xs uppercase tracking-widest font-bold text-emerald bg-emerald/10 self-start px-3 py-1.5 rounded-full shadow-sm">Integrations Engine</span>
                <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-forest leading-tight">
                  Powered by Nomba Infrastructure
                </h2>
                <p className="text-moss leading-relaxed">
                  Qova uses Nomba’s premium payment APIs to eliminate payment friction, manage collections, and disburse circle pots automatically.
                </p>
                <div className="flex gap-4 items-center border-t border-forest/10 pt-6 mt-2">
                  <span className="font-serif text-lg font-bold text-forest">Nomba Developer Suite</span>
                  <span className="text-xs text-moss">| Prototyping in Sandbox Environment</span>
                </div>
              </Reveal>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-8">
              {[
                {
                  title: "Nomba Checkout",
                  tech: "POST /v1/checkout/order",
                  desc: "Supports quick credit card, USSD, and bank transfer contributions via an elegant mobile web view."
                },
                {
                  title: "Dynamic Virtual Accounts",
                  tech: "POST /v1/accounts/virtual",
                  desc: "Generates slot-specific virtual bank accounts allowing members to contribute directly via normal bank transfers."
                },
                {
                  title: "Transfers Engine",
                  tech: "POST /v2/transfers/bank",
                  desc: "Handles instant payouts of the total pot back to circle members at the completion of each cycle."
                },
                {
                  title: "Account Bank Lookup",
                  tech: "POST /v1/transfers/bank/lookup",
                  desc: "Verifies the banking identity of members during profile setup to prevent settlement delivery failures."
                }
              ].map((api, idx) => (
                <Reveal key={idx} delay={idx * 100}>
                  <div className="flex flex-col gap-2 group p-4 rounded-xl hover:bg-white/45 border border-transparent hover:border-forest/5 transition-all duration-300">
                    <h4 className="font-serif font-bold text-forest text-base transition-colors group-hover:text-emerald">{api.title}</h4>
                    <code className="text-[10px] text-emerald bg-emerald/5 px-2 py-0.5 rounded block w-fit font-mono my-1">{api.tech}</code>
                    <p className="text-xs leading-relaxed text-moss">{api.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 border-t border-forest/5">
        <div className="max-w-4xl mx-auto px-6">
          <Reveal className="text-center mb-16 flex flex-col gap-4">
            <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-forest">Frequently Asked Questions</h2>
            <p className="text-moss">Quick answers to clear up questions about savings safety, setup, and platform rules.</p>
          </Reveal>

          <div className="space-y-4">
            {faqData.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <Reveal key={idx} delay={idx * 50}>
                  <div className="border border-forest/10 rounded-2xl overflow-hidden bg-white/70 shadow-sm transition-all hover:border-forest/20">
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full flex items-center justify-between p-5 text-left font-serif font-bold text-forest text-base sm:text-lg focus:outline-none cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <span className="text-lg text-moss shrink-0 ml-4 transition-transform duration-300">{isOpen ? "−" : "+"}</span>
                    </button>
                    {/* Collapsible content with smooth height transition */}
                    <div className={`transition-all duration-500 ease-in-out ${isOpen ? "max-h-[200px] opacity-100 border-t border-forest/5" : "max-h-0 opacity-0 pointer-events-none"
                      }`}>
                      <div className="p-5">
                        <p className="text-sm leading-relaxed text-moss">{faq.a}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-forest/10 bg-canvas py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 animate-pulse">
            <span className="font-serif text-2xl font-bold tracking-tight text-forest">Qova</span>
            <span className="text-[10px] tracking-wider uppercase bg-forest/5 text-forest px-2 py-0.5 rounded font-semibold">Pre-MVP</span>
          </div>

          <p className="text-xs text-moss text-center md:text-left">
            © {new Date().getFullYear()} Qova. Built by **Philotex Group** for the DevCareer × Nomba Hackathon 2026.
          </p>

          <div className="flex gap-6 text-xs text-moss font-semibold">
            <a href="#features" className="hover:text-emerald transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-emerald transition-colors">Process</a>
            <a href="#waitlist" className="hover:text-emerald transition-colors">Waitlist</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
