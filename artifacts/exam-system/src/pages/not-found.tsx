import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <section style={{ padding: "40px 0", background: "#fff", fontFamily: "'Arvo', serif", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1140px", margin: "0 auto", padding: "0 15px" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "600px", textAlign: "center" }}>

            <div
              style={{
                backgroundImage: "url(https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif)",
                height: "400px",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "contain",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
              }}
            >
              <h1 style={{ fontSize: "80px", fontWeight: 800, color: "#1f2937", paddingTop: "12px" }}>404</h1>
            </div>

            <div style={{ marginTop: "-50px" }}>
              <h3 style={{ fontSize: "28px", fontWeight: 700, color: "#1f2937", marginBottom: "12px" }}>
                Look like you're lost
              </h3>
              <p style={{ color: "#6b7280", fontSize: "15px", marginBottom: "24px" }}>
                the page you are looking for is not available!
              </p>
              <button
                onClick={() => setLocation("/")}
                style={{
                  color: "#fff",
                  padding: "10px 28px",
                  background: "#39ac31",
                  margin: "0 0 20px",
                  display: "inline-block",
                  borderRadius: "4px",
                  border: "none",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "none",
                  transition: "background 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#2d8f27")}
                onMouseLeave={e => (e.currentTarget.style.background = "#39ac31")}
              >
                Go to Home
              </button>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
