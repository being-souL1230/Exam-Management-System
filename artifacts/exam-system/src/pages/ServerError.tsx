import { useLocation } from "wouter";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@700&display=swap');

.p500 {
  --block-background: #555;
  --block-border: 1px solid #000;
  --block-shadow: 0 0 0 2px rgba(255,255,255,0.2) inset;
  --block-light-background: linear-gradient(to right,#2579ba 0%,#0089f2 26%,#214db2 50%,#010023 51%,#0d0e19 100%);

  width: 100vw;
  height: 100vh;
  min-height: 450px;
  background: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.p500 *, .p500 *::before, .p500 *::after {
  box-sizing: border-box;
}

/* ── Wrap ── */
.p500-wrap {
  width: 300px;
  height: 260px;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  position: relative;
}

/* ── Lines ── */
.p500-line {
  position: absolute;
  left: 0;
  top: 33%;
  width: 100%;
}
.p500-line-1 { animation: p500-line1 5s 0s ease forwards; }
.p500-line-1 .p500-ball { animation-delay: 0s; }
.p500-line-2 { animation: p500-line2 5s 1.2s ease forwards; }
.p500-line-2 .p500-ball { animation-delay: 1.2s; }
.p500-line-3 { animation: p500-line3 5s 2.4s ease forwards; }
.p500-line-3 .p500-ball { animation-delay: 2.4s; }

/* ── Ball ── */
.p500-ball {
  height: 40px;
  width: 40px;
  border-radius: 50%;
  background: #000;
  color: #fff;
  text-align: center;
  line-height: 40px;
  font-size: 30px;
  font-weight: bold;
  font-family: 'Source Code Pro', monospace;
  z-index: 2;
  animation: p500-ball 5s ease forwards;
}

/* ── Hands ── */
.p500-hand {
  position: absolute;
  top: 50%;
  width: 100%;
  transform-origin: 50% 0;
}
.p500-hand-left {
  left: 6px;
  animation: p500-hand-left 5s 0s ease forwards;
}
.p500-hand-right {
  right: 6px;
  animation: p500-hand-right 5s 0.5s ease forwards;
}

.p500-hand-part {
  height: 2px;
  width: 30px;
  background: #000;
  position: absolute;
}
.p500-part-bottom {
  top: -10px;
  left: 0;
  height: 20px;
  border-radius: 7px;
  background: #ccc;
  border-bottom: 4px solid #000;
}
.p500-part-middle {
  left: 26px;
  top: -10px;
  transform: rotate(-40deg);
}
.p500-part-top {
  left: 45px;
  top: -32px;
  transform: rotate(-60deg);
}

/* right hand mirrors */
.p500-hand-right .p500-part-bottom {
  left: auto;
  right: 0;
}
.p500-hand-right .p500-part-middle {
  left: auto;
  right: 26px;
  transform: rotate(40deg);
}
.p500-hand-right .p500-part-top {
  left: auto;
  right: 45px;
  transform: rotate(60deg);
}

/* ── Server ── */
.p500-server {
  width: 150px;
  height: 250px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 3px solid #1C1000;
  padding-bottom: 2%;
  background: #1C1000;
  position: relative;
}

/* Eyes */
.p500-eye {
  position: absolute;
  top: -12px;
  width: 20px;
  height: 25px;
  border: 1px solid #000;
  box-shadow: 0 0 0 2px #ccc;
  background: #fff;
  border-radius: 50%;
}
.p500-eye span {
  display: block;
  width: 50%;
  height: 50%;
  border: 1px solid;
  border-radius: 50%;
  background: #000;
  position: absolute;
  left: 0;
  top: 1px;
  animation: p500-eyes 8s ease forwards;
}
.p500-eye-left  { left: 30px; }
.p500-eye-right { right: 30px; }

/* Blocks */
.p500-block {
  border: var(--block-border);
  height: 11%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: var(--block-shadow);
  background: var(--block-background);
}
.p500-light {
  width: calc(100% - 4px);
  height: 12px;
  border-bottom: 5px solid #0089f2;
  background: var(--block-light-background);
}

/* Bottom block */
.p500-bottom-block {
  height: 30%;
  border: var(--block-border);
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--block-background);
  box-shadow: var(--block-shadow);
  overflow: hidden;
  position: relative;
}
.p500-bottom-line {
  width: calc(100% - 4px);
  height: 3px;
  background: #fff;
  position: absolute;
  border-bottom: 2px solid #ccc;
}
.p500-bottom-light {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background: #fff;
  border: 2px solid #ccc;
  box-shadow: var(--block-shadow);
  z-index: 2;
}

/* ── Code error text ── */
.p500-code-error {
  width: 60%;
  min-width: 320px;
  text-align: center;
}
.p500-code-error h1 {
  font-family: 'Source Code Pro', monospace;
  font-size: 4vw;
  font-weight: bold;
  margin: 1vw 0;
  color: #000;
}
.p500-btn {
  margin-top: 0.5em;
  font-family: 'Source Code Pro', monospace;
  font-size: 1.2vw;
  min-font-size: 13px;
  background: #1C1000;
  color: #fff;
  border: none;
  padding: 0.6em 2em;
  border-radius: 4px;
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: background 0.2s;
}
.p500-btn:hover { background: #333; }

/* ── Keyframes ── */
@keyframes p500-ball {
  20%  { transform: rotate(180deg); }
  40%  { transform: rotate(0deg); }
  60%  { transform: rotate(180deg); }
  80%  { transform: rotate(0deg); }
  100% { transform: rotate(-90deg); }
}
@keyframes p500-line1 {
  20%  { transform: rotate(180deg); }
  40%  { transform: rotate(0deg); }
  60%  { transform: rotate(180deg); }
  80%  { transform: rotate(0deg); }
  100% { transform: rotate(90deg) translateY(40px); }
}
@keyframes p500-line2 {
  20%  { transform: rotate(180deg); }
  40%  { transform: rotate(0deg); }
  60%  { transform: rotate(180deg); }
  80%  { transform: rotate(0deg); }
  100% { transform: rotate(90deg); }
}
@keyframes p500-line3 {
  20%  { transform: rotate(180deg); }
  40%  { transform: rotate(0deg); }
  60%  { transform: rotate(180deg); }
  80%  { transform: rotate(0deg); }
  100% { transform: rotate(90deg) translateY(-40px); }
}
@keyframes p500-hand-left {
  10%  { transform: rotate(3deg); }
  15%  { transform: rotate(0deg); }
  25%  { transform: rotate(3deg); }
  30%  { transform: rotate(0deg); }
  40%  { transform: rotate(3deg); }
  45%  { transform: rotate(0deg); }
  50%  { transform: rotate(3deg); }
  55%  { transform: rotate(0deg); }
  65%  { transform: rotate(3deg); }
  70%  { transform: rotate(0deg); }
  80%  { transform: rotate(3deg); }
  85%  { transform: rotate(0deg); }
  95%  { transform: rotate(3deg); }
  100% { transform: rotate(0deg); }
}
@keyframes p500-hand-right {
  10%  { transform: rotate(-3deg); }
  15%  { transform: rotate(0deg); }
  25%  { transform: rotate(-3deg); }
  30%  { transform: rotate(0deg); }
  40%  { transform: rotate(-3deg); }
  45%  { transform: rotate(0deg); }
  50%  { transform: rotate(-3deg); }
  55%  { transform: rotate(0deg); }
  65%  { transform: rotate(-3deg); }
  70%  { transform: rotate(0deg); }
  80%  { transform: rotate(-3deg); }
  85%  { transform: rotate(0deg); }
  100% { transform: rotate(0deg); }
}
@keyframes p500-eyes {
  25%  { left: 10px; }
  50%  { left: 0; }
  75%  { top: 0;  left: 10px; }
  100% { top: 7px; left: 5px; }
}
`;

export default function ServerError() {
  const [, setLocation] = useLocation();

  return (
    <div className="p500">
      <style>{css}</style>

      <div className="p500-wrap">
        {/* Left hand */}
        <div className="p500-hand p500-hand-left">
          <span className="p500-hand-part p500-part-top" />
          <span className="p500-hand-part p500-part-middle" />
          <span className="p500-hand-part p500-part-bottom" />
        </div>

        {/* Right hand */}
        <div className="p500-hand p500-hand-right">
          <span className="p500-hand-part p500-part-top" />
          <span className="p500-hand-part p500-part-middle" />
          <span className="p500-hand-part p500-part-bottom" />
        </div>

        {/* Bouncing digit lines */}
        <div className="p500-line p500-line-1">
          <div className="p500-ball">5</div>
        </div>
        <div className="p500-line p500-line-2">
          <div className="p500-ball">0</div>
        </div>
        <div className="p500-line p500-line-3">
          <div className="p500-ball">0</div>
        </div>

        {/* Server */}
        <div className="p500-server">
          <div className="p500-eye p500-eye-left"><span /></div>
          <div className="p500-eye p500-eye-right"><span /></div>
          <div className="p500-block"><div className="p500-light" /></div>
          <div className="p500-block"><div className="p500-light" /></div>
          <div className="p500-block"><div className="p500-light" /></div>
          <div className="p500-block"><div className="p500-light" /></div>
          <div className="p500-block"><div className="p500-light" /></div>
          <div className="p500-bottom-block">
            <div className="p500-bottom-line" />
            <div className="p500-bottom-light" />
          </div>
        </div>
      </div>

      <div className="p500-code-error">
        <h1>Internal Server Error!</h1>
        <button className="p500-btn" onClick={() => setLocation("/")}>
          Go Home
        </button>
      </div>
    </div>
  );
}
