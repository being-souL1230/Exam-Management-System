import { Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import BlurText from "@/components/effects/BlurText";
import GlareHover from "@/components/effects/GlareHover";
import LightRays from "@/components/effects/LightRays";
import ElectricBorderCard from "@/components/developer/ElectricBorderCard";
import { Button } from "@/components/ui/button";
import { EntryButton } from "@/components/ui/entry-button";
import { useAuth } from "@/hooks/use-auth";
import "@/components/ui/glass-card-3d.css";
import "@/components/ui/space-button.css";

const featureItems = [
  {
    title: "Schedule, conduct, and monitor exams",
    copy: "Create exam calendars, assign question sets, track attendance, and keep the operational view clean for admins and teachers.",
  },
  {
    title: "Evaluate outcomes without spreadsheet chaos",
    copy: "Publish results, generate admit cards, manage question banks, and keep student records aligned in one academic workflow.",
  },
  {
    title: "Use AI where it actually helps academics",
    copy: "Ask safe academic questions about schedules, result trends, attendance, and subjects without exposing private student data.",
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#070e1a] text-slate-950">

      {/* ── Hero ── */}
      <section className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,18,34,0.72),rgba(9,18,34,0.86))]" />
        <div className="absolute inset-0">
          <LightRays
            raysOrigin="top-center"
            raysColor="#5eead4"
            raysSpeed={0.6}
            lightSpread={0.75}
            rayLength={1.4}
            pulsating={false}
            fadeDistance={1.1}
            saturation={0.85}
            followMouse={true}
            mouseInfluence={0.08}
            noiseAmount={0.04}
            distortion={0.025}
          />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(94,234,212,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.10),transparent_35%)]" />

        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <header className="flex items-center justify-end">
            <div className="flex items-center gap-2">
              <Link href={isAuthenticated ? "/dashboard" : "/login"}>
                <Button
                  variant="ghost"
                  className="rounded-full border border-white/20 bg-white/8 px-4 text-white hover:bg-white/14 hover:text-white"
                >
                  {isAuthenticated ? "Dashboard" : "Sign In"}
                </Button>
              </Link>
              {!isAuthenticated && (
                <Link href="/register">
                  <Button className="rounded-full bg-[#f0c26e] px-4 text-slate-950 hover:bg-[#f4ce85]">
                    Create account
                  </Button>
                </Link>
              )}
            </div>
          </header>

          <div className="flex flex-1 items-center py-12 lg:py-16">
            <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1.05fr)_360px] lg:items-start">
              <div className="max-w-4xl self-start">
                <BlurText
                  text="Run your full examination system from one polished academic workspace."
                  delay={120}
                  animateBy="words"
                  direction="top"
                  className="max-w-5xl font-serif text-[2.8rem] leading-[0.96] text-white sm:text-[4.4rem] lg:text-[5.8rem]"
                />
                <p className="mt-6 max-w-2xl text-base leading-7 text-white/76 sm:text-lg">
                  Plan exams, manage students, publish results, automate admit cards,
                  monitor attendance, and layer in an academic AI assistant without
                  turning the experience into a cluttered admin dashboard.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <EntryButton
                    text={isAuthenticated ? "Open dashboard" : "Launch workspace"}
                    onClick={() => setLocation(isAuthenticated ? "/dashboard" : "/login")}
                  />
                  {!isAuthenticated && (
                    <Link href="/register">
                      <button type="button" className="space-btn space-btn--auto">
                        <strong>REGISTER</strong>
                        <div className="space-btn-stars-container">
                          <div className="space-btn-stars"></div>
                        </div>
                        <div className="space-btn-glow">
                          <div className="space-btn-circle"></div>
                          <div className="space-btn-circle"></div>
                        </div>
                      </button>
                    </Link>
                  )}
                </div>
                <div className="mt-10 glass-3d-grid">

                  {/* ── Card 1 — Students ── */}
                  <div className="glass-3d-wrapper">
                    <div className="glass-3d-card">
                      <div className="glass-3d-card-body">
                        <span className="glass-3d-accent" style={{ background: "linear-gradient(90deg,#38bdf8,#5eead4)" }} />
                        <div className="glass-3d-label">Students</div>
                        <div className="glass-3d-desc">Profiles, course mapping, attendance-ready records</div>
                      </div>
                    </div>
                  </div>

                  {/* ── Connector A — blue → amber ── */}
                  <div className="glass-3d-connector">
                    <div
                      className="glass-3d-connector-track"
                      style={{
                        background: "linear-gradient(90deg,rgba(56,189,248,0.65),rgba(245,158,11,0.65))",
                        "--conn-glow": "rgba(56,189,248,0.95)",
                        "--conn-delay": "0s",
                      } as React.CSSProperties}
                    >
                      <div className="glass-3d-connector-pip" style={{ background: "linear-gradient(135deg,#38bdf8,#f59e0b)" }} />
                    </div>
                  </div>

                  {/* ── Card 2 — Assessments ── */}
                  <div className="glass-3d-wrapper">
                    <div className="glass-3d-card">
                      <div className="glass-3d-card-body">
                        <span className="glass-3d-accent" style={{ background: "linear-gradient(90deg,#f59e0b,#fb7185)" }} />
                        <div className="glass-3d-label">Assessments</div>
                        <div className="glass-3d-desc">Question bank, exam calendar, session handling</div>
                      </div>
                    </div>
                  </div>

                  {/* ── Connector B — pink → cyan ── */}
                  <div className="glass-3d-connector">
                    <div
                      className="glass-3d-connector-track"
                      style={{
                        background: "linear-gradient(90deg,rgba(251,113,133,0.65),rgba(103,232,249,0.65))",
                        "--conn-glow": "rgba(251,113,133,0.95)",
                        "--conn-delay": "1.1s",
                      } as React.CSSProperties}
                    >
                      <div className="glass-3d-connector-pip" style={{ background: "linear-gradient(135deg,#fb7185,#67e8f9)" }} />
                    </div>
                  </div>

                  {/* ── Card 3 — Outcomes ── */}
                  <div className="glass-3d-wrapper">
                    <div className="glass-3d-card">
                      <div className="glass-3d-card-body">
                        <span className="glass-3d-accent" style={{ background: "linear-gradient(90deg,#67e8f9,#34d399)" }} />
                        <div className="glass-3d-label">Outcomes</div>
                        <div className="glass-3d-desc">Results, analytics, admit cards, safe AI summaries</div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              <div className="hero-card-3d-parent self-start">
                <div className="hero-card-3d">
                <GlareHover
                  width="100%"
                  height="auto"
                  background="rgba(255,255,255,0.08)"
                  borderRadius="28px"
                  borderColor="rgba(255,255,255,0.14)"
                  glareColor="#fff8e1"
                  glareOpacity={0.22}
                  glareAngle={-26}
                  glareSize={280}
                  transitionDuration={900}
                  className="w-full max-w-[360px] backdrop-blur-md"
                  style={{ minHeight: "0px" }}
                >
                  <div className="flex w-full flex-col gap-4 p-5 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.24em] text-white/55">
                          Control Room
                        </div>
                        <div className="mt-2 text-xl font-semibold">Academic command layer</div>
                      </div>
                      <div className="rounded-full border border-white/14 bg-white/10 p-2.5">
                        <Sparkles className="h-4.5 w-4.5 text-[#f0c26e]" />
                      </div>
                    </div>
                    <div className="grid gap-3">
                      {[
                        ["Real-time exam operations", "From planning to result publication"],
                        ["Role-aware access", "Admin, teacher, and student views stay separated"],
                        ["Safe academic AI", "Summaries and answers limited to allowed campus context"],
                      ].map(([title, copy]) => (
                        <div
                          key={title}
                          className="rounded-2xl border border-white/10 bg-slate-950/28 px-4 py-3.5"
                        >
                          <div className="text-sm font-semibold text-white">{title}</div>
                          <div className="mt-1 text-sm leading-6 text-white/64">{copy}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlareHover>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature cards ── */}
      <section className="bg-[#070e1a] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500">
              Built for the whole exam lifecycle
            </div>
            <h2 className="mt-3 font-serif text-4xl leading-tight text-white sm:text-5xl">
              A project front door that feels like a product, not a placeholder.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/55">
              This landing page introduces the platform clearly, then hands people into
              the existing app without making the first screen feel like a generic auth wall.
            </p>
          </div>
          <div className="feature-outer">
          <div className="feature-container">
            <div className="relative z-10 flex flex-col lg:flex-row">
              {featureItems.map((item, index) => (
                <div key={item.title} className="relative flex flex-1">
                  {index > 0 && (
                    <div
                      className="hidden lg:block"
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "12%",
                        bottom: "12%",
                        width: "1px",
                        background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.10) 30%, rgba(255,255,255,0.10) 70%, transparent)",
                      }}
                    />
                  )}
                  {index > 0 && (
                    <div
                      className="block lg:hidden"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: "8%",
                        right: "8%",
                        height: "1px",
                        background: "linear-gradient(to right, transparent, rgba(255,255,255,0.10) 30%, rgba(255,255,255,0.10) 70%, transparent)",
                      }}
                    />
                  )}
                  <div className="flex flex-1 flex-col gap-4 px-8 py-10">
                    <div
                      style={{
                        display: "inline-block",
                        width: "28px",
                        height: "2px",
                        borderRadius: "2px",
                        background: index === 0 ? "linear-gradient(90deg,#38bdf8,#5eead4)" : index === 1 ? "linear-gradient(90deg,#f59e0b,#fb7185)" : "linear-gradient(90deg,#67e8f9,#34d399)",
                        marginBottom: "4px",
                      }}
                    />
                    <h3 className="text-lg font-semibold leading-snug text-white">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-7 text-white/52">
                      {item.copy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* ── Developer ── */}
      <section className="bg-[#070e1a] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500">
              Behind the build
            </div>
            <h2 className="mt-3 font-serif text-4xl leading-tight text-white sm:text-5xl">
              Developer
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/50">
              The person who designed, built, and shipped every layer of this platform.
            </p>
          </div>
          <ElectricBorderCard />
        </div>
      </section>

    </div>
  );
}
