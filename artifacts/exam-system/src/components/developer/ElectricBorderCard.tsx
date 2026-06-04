import "./ElectricBorderCard.css";
import "./SocialCircle.css";
import SocialCircle from "./SocialCircle";

export default function ElectricBorderCard() {
  return (
    <div className="eb-main-container">
      <svg style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}>
        <defs>
          <filter id="dev-turbulent-displace" colorInterpolationFilters="sRGB" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise1" seed="1" />
            <feOffset in="noise1" dx="0" dy="0" result="offsetNoise1">
              <animate attributeName="dy" values="700; 0" dur="6s" repeatCount="indefinite" calcMode="linear" />
            </feOffset>
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise2" seed="1" />
            <feOffset in="noise2" dx="0" dy="0" result="offsetNoise2">
              <animate attributeName="dy" values="0; -700" dur="6s" repeatCount="indefinite" calcMode="linear" />
            </feOffset>
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise1b" seed="2" />
            <feOffset in="noise1b" dx="0" dy="0" result="offsetNoise3">
              <animate attributeName="dx" values="490; 0" dur="6s" repeatCount="indefinite" calcMode="linear" />
            </feOffset>
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise2b" seed="2" />
            <feOffset in="noise2b" dx="0" dy="0" result="offsetNoise4">
              <animate attributeName="dx" values="0; -490" dur="6s" repeatCount="indefinite" calcMode="linear" />
            </feOffset>
            <feComposite in="offsetNoise1" in2="offsetNoise2" result="part1" />
            <feComposite in="offsetNoise3" in2="offsetNoise4" result="part2" />
            <feBlend in="part1" in2="part2" mode="color-dodge" result="combinedNoise" />
            <feDisplacementMap in="SourceGraphic" in2="combinedNoise" scale="30" xChannelSelector="R" yChannelSelector="B" />
          </filter>
        </defs>
      </svg>

      <div className="eb-card-container">
        {/* Electric border layers — absolutely positioned behind content */}
        <div className="eb-border-frame">
          <div className="eb-main-card-border" />
          <div className="eb-glow-layer-1" />
          <div className="eb-glow-layer-2" />
          <div className="eb-overlay-1" />
        </div>
        <div className="eb-background-glow" />

        {/* Content flows naturally inside the card */}
        <div className="eb-content">
          <div className="eb-top-row">
            <span className="eb-badge">Developer</span>
          </div>

          <div className="eb-profile-social-row">
            <div className="eb-avatar">
              <span className="eb-avatar-initials">MH</span>
            </div>
            <div className="eb-name-block">
              <p className="eb-title">Md Haseeb</p>
              <p className="eb-role">Backend Developer</p>
            </div>
            <div className="eb-social-corner">
              <SocialCircle />
            </div>
          </div>

          <hr className="eb-divider" />

          <div className="eb-bottom-row">
            <p className="eb-description">
              4th year student at Techno India University, CSE AI. Passionate about backend systems,
              building reliable APIs, and crafting tools that make academic workflows simpler and smarter.
            </p>
            <div className="eb-tags">
              <span className="eb-tag">React</span>
              <span className="eb-tag">Flask</span>
              <span className="eb-tag">TypeScript</span>
              <span className="eb-tag">SQLite</span>
              <span className="eb-tag">AI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
