import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://lglcmytuzyvaelmbvijx.supabase.co";
const SUPABASE_KEY = "sb_publishable_btlm62UHnDhbI8Nqex09zQ_t2uEkzsY";

const CATEGORIES = ["Tout", "Carrelage", "Parquet", "Peinture", "Bois", "Métal", "Isolation", "Plomberie", "Électricité", "Autre"];
const EMOJIS = { Carrelage: "🪨", Parquet: "🪵", Peinture: "🪣", Bois: "🌲", Isolation: "🧱", Plomberie: "🚿", Métal: "⚙️", Électricité: "⚡", Autre: "📦" };

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "",
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function uploadPhoto(file) {
  const ext = file.name.split(".").pop();
  const filename = `${Date.now()}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/photos/${filename}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": file.type,
      "x-upsert": "true",
    },
    body: file,
  });
  if (!res.ok) throw new Error("Erreur upload photo");
  return `${SUPABASE_URL}/storage/v1/object/public/photos/${filename}`;
}

export default function App() {
  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("liste");
  const [selected, setSelected] = useState(null);
  const [filtre, setFiltre] = useState("Tout");
  const [recherche, setRecherche] = useState("");
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const fileRef = useRef();
  const [form, setForm] = useState({ titre: "", categorie: "Carrelage", quantite: "", prix: "", ville: "", description: "", contact: "" });

  useEffect(() => { fetchAnnonces(); }, []);

  const fetchAnnonces = async () => {
    setLoading(true); setError(null);
    try {
      const data = await sbFetch("annonces?select=*&order=created_at.desc");
      setAnnonces(data || []);
    } catch (e) { setError("Impossible de charger les annonces"); }
    setLoading(false);
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = annonces.filter(a => {
    const matchCat = filtre === "Tout" || a.categorie === filtre;
    const matchSearch = (a.titre || "").toLowerCase().includes(recherche.toLowerCase()) ||
      (a.ville || "").toLowerCase().includes(recherche.toLowerCase());
    return matchCat && matchSearch;
  });

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.titre || !form.ville || !form.contact) {
      showToast("Remplis les champs obligatoires !", "error"); return;
    }
    setSubmitting(true);
    try {
      let photoUrl = null;
      if (photoFile) {
        try { photoUrl = await uploadPhoto(photoFile); }
        catch { showToast("Photo non uploadée, annonce publiée sans photo", "error"); }
      }
      await sbFetch("annonces", {
        method: "POST", prefer: "return=minimal",
        body: JSON.stringify({ ...form, prix: Number(form.prix) || 0, photo: photoUrl, emoji: EMOJIS[form.categorie] || "📦" }),
      });
      setForm({ titre: "", categorie: "Carrelage", quantite: "", prix: "", ville: "", description: "", contact: "" });
      setPhotoPreview(null); setPhotoFile(null);
      await fetchAnnonces();
      setView("liste");
      showToast("Annonce publiée ✓");
    } catch (e) { showToast("Erreur : " + e.message, "error"); }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    try {
      await sbFetch(`annonces?id=eq.${id}`, { method: "DELETE" });
      await fetchAnnonces(); setView("liste");
      showToast("Annonce supprimée");
    } catch { showToast("Erreur suppression", "error"); }
  };

  const timeAgo = (d) => {
    if (!d) return "";
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 2) return "À l'instant";
    if (m < 60) return `Il y a ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `Il y a ${h}h`;
    return `Il y a ${Math.floor(h / 24)}j`;
  };

  const PhotoDisplay = ({ src, emoji, height = 110, fontSize = 48 }) => (
    <div style={{ background: src ? "black" : "#F5F0E8", height, display: "flex", alignItems: "center", justifyContent: "center", fontSize, overflow: "hidden" }}>
      {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>{emoji || "📦"}</span>}
    </div>
  );

  return (
    <div style={{ fontFamily: "'Syne', sans-serif", background: "#F5F0E8", minHeight: "100vh", color: "#1a1a1a" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { cursor: pointer; border: none; font-family: 'Syne', sans-serif; }
        input, textarea, select { font-family: 'DM Sans', sans-serif; }
        .card { transition: all 0.25s ease; }
        .card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,0.12); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideIn { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }
        .page { animation: fadeIn 0.3s ease; }
        .toast { animation: slideIn 0.3s ease; }
        .upload-zone:hover { border-color: #D4A853 !important; background: #FFF9F0 !important; }
      `}</style>

      {/* HEADER */}
      <header style={{ background: "#1a1a1a", padding: "0 24px", position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setView("liste")}>
          <span style={{ fontSize: 22 }}>🧱</span>
          <span style={{ color: "white", fontWeight: 800, fontSize: 18 }}>MatériauX</span>
          <span style={{ background: "#D4A853", color: "#1a1a1a", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>BÊTA</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ color: "#888", fontSize: 13 }}>{annonces.length} annonces</span>
          <button onClick={() => setView("formulaire")} style={{ background: "#D4A853", color: "#1a1a1a", fontWeight: 700, fontSize: 13, padding: "9px 18px", borderRadius: 8 }}>+ Publier</button>
        </div>
      </header>

      {toast && (
        <div className="toast" style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? "#e74c3c" : "#2ecc71", color: "white", padding: "12px 24px", borderRadius: 10, fontWeight: 600, fontSize: 14, zIndex: 999, whiteSpace: "nowrap" }}>
          {toast.msg}
        </div>
      )}

      {/* LISTE */}
      {view === "liste" && (
        <div className="page" style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: "clamp(26px, 5vw, 46px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1.5px" }}>
              Matériaux de chantier<br /><span style={{ color: "#D4A853" }}>à prix cassés</span> près de chez toi
            </h1>
            <p style={{ fontFamily: "'DM Sans'", color: "#666", marginTop: 10, fontSize: 15 }}>Des artisans revendent leurs restes. Tu récupères. Tout le monde gagne.</p>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            <input placeholder="🔍  Cherche un matériau, une ville..." value={recherche} onChange={e => setRecherche(e.target.value)}
              style={{ flex: 1, padding: "12px 16px", border: "2px solid #E8E0D0", borderRadius: 10, fontSize: 14, background: "white", outline: "none" }} />
            <button onClick={fetchAnnonces} style={{ background: "white", border: "2px solid #E8E0D0", borderRadius: 10, padding: "0 14px", fontSize: 18 }}>🔄</button>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 26, flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFiltre(cat)} style={{
                padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: "2px solid",
                borderColor: filtre === cat ? "#D4A853" : "#E8E0D0",
                background: filtre === cat ? "#D4A853" : "white",
                color: filtre === cat ? "#1a1a1a" : "#555",
              }}>{cat}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <div style={{ width: 40, height: 40, border: "3px solid #E8E0D0", borderTopColor: "#D4A853", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
              <p style={{ fontFamily: "'DM Sans'", color: "#999" }}>Chargement...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#e74c3c" }}>
              <p style={{ fontFamily: "'DM Sans'" }}>{error}</p>
              <button onClick={fetchAnnonces} style={{ marginTop: 16, background: "#1a1a1a", color: "white", padding: "10px 20px", borderRadius: 8, fontWeight: 700 }}>Réessayer</button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
              <p style={{ fontFamily: "'DM Sans'" }}>Aucune annonce trouvée</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {filtered.map(a => (
                <div key={a.id} className="card" onClick={() => { setSelected(a); setView("detail"); }}
                  style={{ background: "white", borderRadius: 16, overflow: "hidden", cursor: "pointer", border: "1px solid #EEE8DC" }}>
                  <PhotoDisplay src={a.photo} emoji={a.emoji} height={140} />
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ background: "#FFF5E0", color: "#B8922A", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>{a.categorie}</span>
                      <span style={{ fontWeight: 800, fontSize: 17, color: "#D4A853" }}>{a.prix}€</span>
                    </div>
                    <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, lineHeight: 1.3 }}>{a.titre}</h3>
                    <p style={{ fontFamily: "'DM Sans'", color: "#777", fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>{a.description}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#999", fontFamily: "'DM Sans'" }}>
                      <span>📍 {a.ville} · {a.quantite}</span>
                      <span>{timeAgo(a.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DETAIL */}
      {view === "detail" && selected && (
        <div className="page" style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px" }}>
          <button onClick={() => setView("liste")} style={{ background: "none", color: "#888", fontSize: 14, marginBottom: 20, fontFamily: "'DM Sans'" }}>← Retour</button>
          <div style={{ background: "white", borderRadius: 20, overflow: "hidden", border: "1px solid #EEE8DC" }}>
            <PhotoDisplay src={selected.photo} emoji={selected.emoji} height={220} fontSize={72} />
            <div style={{ padding: "24px 28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ background: "#FFF5E0", color: "#B8922A", fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 8 }}>{selected.categorie}</span>
                <span style={{ fontWeight: 800, fontSize: 26, color: "#D4A853" }}>{selected.prix} €</span>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>{selected.titre}</h1>
              <div style={{ display: "flex", gap: 14, fontFamily: "'DM Sans'", color: "#666", fontSize: 13, marginBottom: 18, flexWrap: "wrap" }}>
                <span>📍 {selected.ville}</span><span>📦 {selected.quantite}</span><span>🕐 {timeAgo(selected.created_at)}</span>
              </div>
              <p style={{ fontFamily: "'DM Sans'", color: "#444", lineHeight: 1.7, fontSize: 14, marginBottom: 24 }}>{selected.description}</p>
              <div style={{ borderTop: "1px solid #F0EAE0", paddingTop: 20, display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontFamily: "'DM Sans'", fontSize: 11, color: "#999" }}>Publié par</p>
                  <p style={{ fontWeight: 700, fontSize: 15 }}>{selected.contact}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { navigator.clipboard?.writeText(`Bonjour, je suis intéressé par "${selected.titre}"`); showToast("Message copié !"); }}
                    style={{ background: "#1a1a1a", color: "white", padding: "11px 20px", borderRadius: 10, fontWeight: 700, fontSize: 13 }}>✉️ Contacter</button>
                  <button onClick={() => handleDelete(selected.id)} style={{ background: "#FFF0F0", color: "#e74c3c", padding: "11px 14px", borderRadius: 10, fontWeight: 700 }}>🗑️</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORMULAIRE */}
      {view === "formulaire" && (
        <div className="page" style={{ maxWidth: 580, margin: "0 auto", padding: "32px 20px" }}>
          <button onClick={() => setView("liste")} style={{ background: "none", color: "#888", fontSize: 14, marginBottom: 20, fontFamily: "'DM Sans'" }}>← Retour</button>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Publier une annonce</h2>
          <p style={{ fontFamily: "'DM Sans'", color: "#888", marginBottom: 24, fontSize: 13 }}>Gratuit · Visible par tous · En 30 secondes</p>
          <div style={{ background: "white", borderRadius: 20, padding: "24px", border: "1px solid #EEE8DC", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Upload photo */}
            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: 12, marginBottom: 8 }}>📸 Photo de ton matériau</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
              {photoPreview ? (
                <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", height: 180 }}>
                  <img src={photoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={() => { setPhotoPreview(null); setPhotoFile(null); }}
                    style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "white", borderRadius: "50%", width: 30, height: 30, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>
              ) : (
                <div className="upload-zone" onClick={() => fileRef.current.click()}
                  style={{ border: "2px dashed #E8E0D0", borderRadius: 12, padding: "28px 20px", textAlign: "center", cursor: "pointer", transition: "all 0.2s", background: "#FAFAF8" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                  <p style={{ fontFamily: "'DM Sans'", color: "#888", fontSize: 13 }}>Clique pour ajouter une photo</p>
                  <p style={{ fontFamily: "'DM Sans'", color: "#bbb", fontSize: 11, marginTop: 4 }}>JPG, PNG · Max 5MB</p>
                </div>
              )}
            </div>

            {[
              { label: "Titre *", key: "titre", placeholder: "Ex: Carrelage grès cérame 60x60" },
              { label: "Quantité", key: "quantite", placeholder: "Ex: 15 m², 10 sacs..." },
              { label: "Prix (€)", key: "prix", placeholder: "0", type: "number" },
              { label: "Ville *", key: "ville", placeholder: "Paris, Lyon..." },
              { label: "Ton prénom *", key: "contact", placeholder: "Jean, Marie..." },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontWeight: 700, fontSize: 12, marginBottom: 5 }}>{f.label}</label>
                <input type={f.type || "text"} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: "100%", padding: "10px 13px", border: "2px solid #E8E0D0", borderRadius: 10, fontSize: 14, outline: "none", background: "#FAFAF8" }} />
              </div>
            ))}

            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: 12, marginBottom: 5 }}>Catégorie</label>
              <select value={form.categorie} onChange={e => setForm(p => ({ ...p, categorie: e.target.value }))}
                style={{ width: "100%", padding: "10px 13px", border: "2px solid #E8E0D0", borderRadius: 10, fontSize: 14, background: "#FAFAF8" }}>
                {CATEGORIES.filter(c => c !== "Tout").map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: 12, marginBottom: 5 }}>Description</label>
              <textarea placeholder="État, couleur, marque..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                style={{ width: "100%", padding: "10px 13px", border: "2px solid #E8E0D0", borderRadius: 10, fontSize: 14, resize: "vertical", background: "#FAFAF8" }} />
            </div>

            <button onClick={handleSubmit} disabled={submitting}
              style={{ background: submitting ? "#ccc" : "#D4A853", color: "#1a1a1a", fontWeight: 800, fontSize: 15, padding: "13px", borderRadius: 12 }}>
              {submitting ? "Publication en cours..." : "Publier mon annonce →"}
            </button>
          </div>
        </div>
      )}

      <footer style={{ textAlign: "center", padding: "28px 20px", color: "#AAA", fontSize: 11, fontFamily: "'DM Sans'" }}>
        MatériauX · Connecté à Supabase 🟢
      </footer>
    </div>
  );
}
