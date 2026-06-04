import { useLocation } from "wouter";
import { useEffect, useState } from "react";


const css = `
@import url('https://fonts.googleapis.com/css2?family=Cabin+Sketch:wght@700&display=swap');

.p401 {
  height: 100vh;
  background: #FF8A65;
  overflow: hidden;
  position: relative;
  font-size: 0.75vw;
  font-family: arial;
  --spd: 0.2s;
}

/* ── Cow ── */
.p401-cow {
  width: 30em;
  aspect-ratio: 2/1;
  border-radius: 4em / 15%;
  background: #fefefe;
  position: absolute;
  top: 40%;
  left: 38%;
  z-index: 10;
  transform-origin: 100% 150%;
  transform: translateY(15em) rotate(90deg);
  animation:
    p401-jmb var(--spd) linear,
    p401-move calc(var(--spd) * 10) linear;
}
.p401-cow::before {
  content: '';
  position: absolute;
  left: 11%; top: 0;
  width: 40%; height: 60%;
  color: #000;
  background: currentcolor;
  border-radius: 0 0 100% 50%;
  box-shadow: 9em -2em 0 -2em, 15em -3em 0 -3em;
}
.p401-cow::after {
  content: '';
  position: absolute;
  left: 20%; bottom: 6%;
  color: #000;
  background: currentcolor;
  box-shadow: 8em -4em 0 -1em;
  width: 5em;
  aspect-ratio: 1/1;
  border-radius: 43% 57% 51% 49% / 51% 55% 45% 49%;
}

/* ── Head ── */
.p401-head {
  position: absolute;
  top: 0; left: 100%;
  z-index: 1;
}
.p401-face {
  width: 11em;
  aspect-ratio: 12.5/7.5;
  background: #fff;
  box-shadow: -2em 4.5em #000 inset;
  border-radius: 10% 100% 50% 45% / 44% 72% 26% 25%;
  transform: rotateX(180deg) rotate(-55deg) translate(-25%, -55%);
  position: relative;
  z-index: 10;
}
.p401-head::after, .p401-head::before {
  content: '';
  position: absolute;
  top: -3.5em; left: -5.5em;
  transform: rotate(-25deg);
  background: #000;
  width: 4em; height: 5em;
  z-index: 20;
  box-shadow: 0.2em 0.1em 0 0.2em #fff inset;
  border-radius: 0% 100% 38% 62% / 41% 73% 27% 59%;
}
.p401-head::before {
  z-index: 2;
  top: -4em; left: -5em;
  transform: rotate(-5deg);
}

/* ── Legs ── */
.p401-leg {
  position: absolute;
  top: 95%;
  background: #fff;
  width: 1.5em; height: 3em;
  transform-origin: top center;
}
.p401-leg::after {
  content: '';
  position: absolute;
  left: 0; top: 90%;
  width: 100%; height: 2.5em;
  background: #fff;
  border-bottom: 1.5em solid #000;
}
.p401-leg-b       { left: 4%;  animation: p401-legB var(--spd) alternate infinite; }
.p401-leg-b.p401-leg-l { left: 13%; }
.p401-leg-b.p401-leg-l::after { left: 10%; top: 75%; transform: rotate(-5deg); }
.p401-leg-b.p401-leg-r { animation-delay: var(--spd); }
.p401-leg-b.p401-leg-r::after { left: 32%; top: 90%; transform: rotate(-15deg); }
.p401-leg-f       { right: 5%; animation: p401-legF var(--spd) alternate infinite; }
.p401-leg-f.p401-leg-l { right: 10%; animation-delay: var(--spd); }
.p401-leg-f.p401-leg-l::after { right: 10%; left: auto; top: 75%; transform: rotate(5deg); }
.p401-leg-f.p401-leg-r::after { right: 20%; left: auto; top: 90%; transform: rotate(10deg); }

/* ── Tail ── */
.p401-tail {
  position: absolute;
  right: 98%; top: 12%;
  width: 2em; height: 10em;
  border-left: 0.5em solid #fff;
  border-top: 0.5em solid #fff;
  border-radius: 100% 0% 51% 49% / 42% 100% 0% 58%;
  transform-origin: top left;
  animation: p401-tail 0.75s alternate infinite;
}
.p401-tail::after {
  content: '';
  position: absolute;
  left: 7%; top: 100%;
  background: #000;
  width: 1.5em; height: 1.75em;
  border-radius: 70% 30% 100% 0% / 100% 30% 70% 0%;
  transform: rotate(-60deg);
}

/* ── Well ── */
.p401-well {
  background: #000;
  width: 30em; height: 2em;
  position: absolute;
  top: calc(40% + 19em);
  left: 60%;
  border-radius: 50%;
}
.p401-well::before {
  content: '';
  position: absolute;
  left: 0; top: 0;
  width: 100%; height: 100%;
  border-radius: 50%;
  box-shadow: 0 -1.2em 0.25em #000 inset;
  z-index: 110;
}
.p401-well::after {
  content: '';
  position: absolute;
  left: 0; top: 50%;
  width: 100%; height: 24em;
  background: #FF8A65;
  z-index: 100;
}

/* ── Button ── */
.p401-btn {
  position: absolute;
  left: -190%;
  top: 2em;
  font-size: 2.5em;
  font-weight: bold;
  color: #000;
  background: #FFD600;
  border: none;
  cursor: pointer;
  padding: 1.5em 3em;
  border-radius: 1em;
  transform-origin: 45em 45em;
  animation: p401-btnAnim calc(var(--spd) * 20) linear;
  z-index: 200;
  transition: background 0.3s;
}
.p401-btn:hover { background: #FBC02D; }

/* ── Text ── */
.p401-text {
  position: absolute;
  left: 10%;
  top: 28%;
  z-index: 50;
  font-family: "Cabin Sketch", serif;
  font-weight: 700;
  color: #fff;
  text-align: center;
  pointer-events: none;
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.p401-text h1 {
  font-size: 18vw;
  margin: 0;
  line-height: 0.75;
}
.p401-text p {
  font-size: 3.75vw;
  width: 31.5vw;
  line-height: 1;
  margin: 0;
}

/* ── Keyframes ── */
@keyframes p401-jmb {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(5px); }
}
@keyframes p401-move {
  0%   { left: 0%;   transform: translateY(0) rotate(0deg); }
  85%  { left: 38%;  transform: translateY(0) rotate(0deg); }
  90%  { left: 40%;  transform: translateY(0) rotate(5deg); }
  95%  { left: 38%;  transform: translateY(0) rotate(90deg); }
  100% { left: 38%;  transform: translateY(15em) rotate(90deg); }
}
@keyframes p401-legB {
  0%   { transform: rotate(2deg)  translateY(0%); }
  100% { transform: rotate(-5deg) translateY(-5%); }
}
@keyframes p401-legF {
  0%   { transform: rotate(0deg)   translateY(0%); }
  100% { transform: rotate(-15deg) translateY(-5%); }
}
@keyframes p401-tail {
  0%   { transform: rotate(3deg);  height: 10em; }
  100% { transform: rotate(-3deg); height: 8em; }
}
@keyframes p401-btnAnim {
  0%, 48% { transform: translateX(-10em) rotate(95deg); }
  55%, 100% { transform: translateX(0) rotate(0deg); }
}
`;

export default function Unauthorized() {
  const [, setLocation] = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="p401">
      <style>{css}</style>

      <div className="p401-cow">
        <div className="p401-head">
          <div className="p401-face" />
        </div>
        <div className="p401-leg p401-leg-b p401-leg-l" />
        <div className="p401-leg p401-leg-b p401-leg-r" />
        <div className="p401-leg p401-leg-f p401-leg-l" />
        <div className="p401-leg p401-leg-f p401-leg-r" />
        <div className="p401-tail" />
      </div>

      <div className="p401-well">
        <button className="p401-btn" onClick={() => setLocation("/")}>
          Go Home
        </button>
      </div>

      <div
        className="p401-text"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(-1em)",
        }}
      >
        <h1>401</h1>
        <p>Sorry, You don't have access there...</p>
      </div>
    </div>
  );
}
