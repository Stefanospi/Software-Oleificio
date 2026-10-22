import type { Customer } from "@/types";

// ─── GENERAZIONE PDF DICHIARAZIONE SOSTITUTIVA ─────────────────────────────
// Riproduce fedelmente il template DICHIARAZIONE SOSTITUTIVA DI ATTO DI NOTORIETÀ
// (Art. 47 D.P.R. 28 dicembre 2000, n. 445)
// I campi precompilati vengono presi dall'anagrafica del cliente.
// I campi checkbox e firma vengono lasciati vuoti per compilazione manuale.

export async function generateDichiarazione(customer: Customer): Promise<void> {
  // Import dinamico di jsPDF (solo client-side)
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 18;

  const LINE_H = 5.5;
  const SECTION_GAP = 4;

  // ─── Funzioni helper ──────────────────────────────────────────────────────
  const addLine = (h = 1) => { y += LINE_H * h; };
  const bold = () => doc.setFont("helvetica", "bold");
  const normal = () => doc.setFont("helvetica", "normal");
  const small = () => doc.setFontSize(9);
  const medium = () => doc.setFontSize(10);
  const large = () => doc.setFontSize(11);

  const field = (value: string | undefined, label: string, length = 50) =>
    value?.trim()
      ? `${value.trim()}`
      : `${"_".repeat(Math.max(8, length - label.length))}`;

  const underline = (text: string, x: number, y: number, w: number) => {
    doc.text(text, x, y);
    doc.line(x, y + 0.8, x + w, y + 0.8);
  };

  const checkbox = (x: number, y: number) => {
    doc.rect(x, y - 3.5, 3.5, 3.5);
  };

  const textBlock = (text: string, x: number, startY: number, width: number): number => {
    const lines = doc.splitTextToSize(text, width);
    doc.text(lines, x, startY);
    return startY + lines.length * LINE_H;
  };

  // ─── TITOLO ───────────────────────────────────────────────────────────────
  bold();
  doc.setFontSize(10.5);
  doc.text("DICHIARAZIONE SOSTITUTIVA DI ATTO DI NOTORIETÀ", pageW / 2, y, { align: "center" });
  addLine(0.8);
  y += 1;
  doc.text("(Art. 47 D.P.R. 28 dicembre 2000, n. 445)", pageW / 2, y, { align: "center" });
  y += 8;

  // ─── INTESTAZIONE ANAGRAFICA ───────────────────────────────────────────────
  normal();
  medium();

  const fullName = `${customer.firstName} ${customer.lastName}`.trim();
  const birthCity = customer.birthCity ?? "";
  const birthProv = customer.birthProvince ? `(${customer.birthProvince})` : "(____)";
  const birthDate = customer.birthDate
    ? new Date(customer.birthDate).toLocaleDateString("it-IT")
    : "____/____/________";
  const cf = customer.fiscalCode ?? "";
  const address = customer.address ?? "";
  const addressNum = customer.addressNumber ?? "";
  const city = customer.city ?? "";
  const province = customer.province ? `(${customer.province})` : "(____)";
  const phoneEmail = [customer.phone, customer.email].filter(Boolean).join(" / ");

  // Riga 1: Il/La sottoscritto/a ... Nato/a a ... (...) il ...
  let x = margin;
  doc.text("Il/La sottoscritto/a ", x, y);
  x += doc.getTextWidth("Il/La sottoscritto/a ");
  // nome precompilato
  bold();
  doc.text(fullName || "_".repeat(30), x, y);
  x += doc.getTextWidth(fullName || "_".repeat(30)) + 4;
  normal();
  doc.text("Nato/a a ", x, y);
  x += doc.getTextWidth("Nato/a a ");
  bold();
  doc.text(birthCity || "_".repeat(20), x, y);
  x += doc.getTextWidth(birthCity || "_".repeat(20)) + 2;
  normal();
  doc.text(birthProv, x, y);
  x += doc.getTextWidth(birthProv) + 2;
  doc.text("il", x, y);
  x += doc.getTextWidth("il ") + 1;
  bold();
  doc.text(birthDate, x, y);

  // Riga 2: _/_/_ Codice Fiscale ... Residente in Via/Piazza ...
  y += LINE_H + 1.5;
  x = margin;
  normal();
  doc.text("Codice Fiscale ", x, y);
  x += doc.getTextWidth("Codice Fiscale ");
  bold();
  doc.text(cf || "_".repeat(16), x, y);
  x += doc.getTextWidth(cf || "_".repeat(16)) + 4;
  normal();
  doc.text("Residente in Via/Piazza ", x, y);
  x += doc.getTextWidth("Residente in Via/Piazza ");
  bold();
  doc.text(address || "_".repeat(30), x, y);

  // Riga 3: n. ... Comune ... (...) Telefono/Email ...
  y += LINE_H + 1;
  x = margin;
  normal();
  doc.text("n. ", x, y);
  x += doc.getTextWidth("n. ");
  bold();
  doc.text(addressNum || "______", x, y);
  x += doc.getTextWidth(addressNum || "______") + 4;
  normal();
  doc.text("Comune ", x, y);
  x += doc.getTextWidth("Comune ");
  bold();
  doc.text(city || "_".repeat(20), x, y);
  x += doc.getTextWidth(city || "_".repeat(20)) + 2;
  normal();
  doc.text(province, x, y);
  x += doc.getTextWidth(province) + 4;
  doc.text("Telefono/Email ", x, y);
  x += doc.getTextWidth("Telefono/Email ");
  bold();
  doc.text(phoneEmail || "_".repeat(28), x, y);

  // Riga 4: testo legale
  y += LINE_H + 1;
  normal();
  small();
  y = textBlock(
    "consapevole delle sanzioni penali richiamate dall'art. 76 del D.P.R. 445/2000 in caso di dichiarazioni mendaci e formazione o uso di atti falsi, sotto la propria personale responsabilità:",
    margin,
    y,
    contentW
  );
  y += SECTION_GAP;

  // ─── SEZIONE DICHIARA ─────────────────────────────────────────────────────
  medium();
  bold();
  doc.text("DICHIARA", pageW / 2, y, { align: "center" });
  y += LINE_H + 1;
  normal();
  small();

  // Punto 1: olive raccolte
  x = margin;
  doc.text("- ", x, y);
  const oggi = new Date().toLocaleDateString("it-IT");
  y = textBlock(
    `di aver raccolto in data ____/____/________ le olive conferite in data odierna, provenienti esclusivamente dai terreni condotti a titolo di (proprietà/affitto/comodato) siti nel Comune di _______________________ in c.da`,
    margin + 4,
    y,
    contentW - 4
  );
  y += 1;
  doc.text("___________________________  Foglio n. __________  Particella/e n. __________", margin + 4, y);
  y += LINE_H + 2;

  // Punto 2: destinazione olive
  doc.text("- ", margin, y);
  doc.text("che le olive prodotte, per un quantitativo stimato di kg _____________, sono destinate a:", margin + 4, y);
  y += LINE_H + 1;
  checkbox(margin + 6, y);
  doc.text("Molitura in conto terzi per autoconsumo familiare (l'olio torna al produttore).", margin + 11, y);
  y += LINE_H;
  checkbox(margin + 6, y);
  doc.text("Vendita diretta/Cessione al frantoio delle olive stesse.", margin + 11, y);
  y += LINE_H + 2;

  // Punto 3: Inoltre
  doc.text("- ", margin, y);
  doc.text("Inoltre:", margin + 4, y);
  y += LINE_H;
  checkbox(margin + 6, y);
  y = textBlock(
    "Di non esercitare attività d'impresa e che la raccolta/cessione ha carattere del tutto occasionale.",
    margin + 11,
    y,
    contentW - 15
  );
  y += 1;
  checkbox(margin + 6, y);
  y = textBlock(
    "Di essere produttore agricolo esonerato dagli adempimenti IVA ai sensi dell'art. 34, comma 6, D.P.R. 633/1972, in quanto il volume d'affari annuo non supera i 7.000,00 €.",
    margin + 11,
    y,
    contentW - 15
  );
  y += 2;

  // Punto 4: Registro SIAN
  doc.text("- ", margin, y);
  y = textBlock(
    "Fare richiesta di provvedere alla registrazione sul Registro Telematico del Portale SIAN, classificando l'olio sopra indicato come (barrare la casella):",
    margin + 4,
    y,
    contentW - 4
  );
  y += 1;
  checkbox(margin + 6, y); doc.text("EXTRA VERGINE", margin + 11, y); y += LINE_H;
  checkbox(margin + 6, y); doc.text("VERGINE", margin + 11, y); y += LINE_H;
  checkbox(margin + 6, y); doc.text("LAMPANTE", margin + 11, y); y += LINE_H + 2;

  // Punto 5: MOCA
  doc.text("- ", margin, y);
  y = textBlock(
    "Che i propri contenitori destinati al ritiro dell'olio prodotto dalla molitura delle proprie olive, sono conformi alla normativa sui Materiali e Oggetti a Contatto con gli Alimenti (MOCA) e risultano perfettamente igienizzati. Il Frantoio è pertanto sollevato da ogni responsabilità per eventuali contaminazioni derivanti da tali contenitori.",
    margin + 4,
    y,
    contentW - 4
  );
  y += 2;

  // Punto 6: Destinazione olio
  doc.text("- ", margin, y);
  doc.text("Che la destinazione dell'olio prodotto è:", margin + 4, y);
  y += LINE_H + 1;
  checkbox(margin + 6, y);
  y = textBlock(
    "USO PERSONALE/FAMILIARE (AUTOCONSUMO): L'olio NON è destinato alla commercializzazione. Si dichiara di non superare il limite di 350 kg di olio prodotto per l'intera campagna olearia, beneficiando così dell'esenzione dall'obbligo del Fascicolo Aziendale.",
    margin + 11,
    y,
    contentW - 15
  );
  y += 1;
  checkbox(margin + 6, y);
  y = textBlock(
    "DESTINATO ALLA COMMERCIALIZZAZIONE: Dichiara di aver costituito e regolarmente aggiornato il Fascicolo Aziendale, ai sensi del D.P.R. 503/1999 e D.Lgs. 99/2004, consapevole che in caso di inottemperanza le produzioni non possono essere commercializzate ai sensi di legge.",
    margin + 11,
    y,
    contentW - 15
  );
  y += 2;

  // Punto 7: Privacy GDPR
  doc.text("- ", margin, y);
  bold();
  doc.text("Informativa Privacy (GDPR)", margin + 4, y);
  y += LINE_H;
  normal();
  y = textBlock(
    "Il Sottoscritto dichiara di aver preso visione dell'informativa sul trattamento dei dati personali (Reg. UE 2016/679 - GDPR) e acconsente al trattamento dei propri dati per le finalità connesse alla presente richiesta, incluse le registrazioni contabili e gli adempimenti telematici di legge (SIAN).",
    margin + 4,
    y,
    contentW - 4
  );
  y += 8;

  // ─── FOOTER: Città e Firma ─────────────────────────────────────────────────
  medium();
  doc.text("Bronte _________________________", margin, y);
  y += 12;
  doc.text("Firma del Dichiarante _________________________________", margin, y);

  // ─── DOWNLOAD ─────────────────────────────────────────────────────────────
  const fileName = `dichiarazione_${customer.lastName}_${customer.firstName}_${new Date().getFullYear()}.pdf`;
  doc.save(fileName);
}
