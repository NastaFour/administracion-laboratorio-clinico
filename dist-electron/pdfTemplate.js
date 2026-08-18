"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const generateReportHTML = (data) => {
  const { patient, results, generalObservation, examName, config, edad, format, showObservations } = data;
  const lab_nombre = config?.lab_nombre || "LABORATORIO CLÍNICO VILLALOBOS FUENMAYOR";
  const lab_direccion = config?.lab_direccion || "CENTRO MEDICO MARES - C.C. TRINIDAD - C.C. FINARCA";
  const lab_sedes = config?.lab_sedes || "4 BOCAS - NUEVA LUCHA - SANTA CRUZ";
  const prof_nombre = config?.prof_nombre || "MSc. Judith Lugo P.";
  const prof_titulo = config?.prof_titulo || "Lic. En Bioanálisis - MSc. En Microbiología";
  const prof_cedula = config?.prof_cedula || "14.522.288";
  config?.prof_creds || "MSDS: 11330 / C.B.Z.: 2122";
  const logoPath = `C:/Users/j1347/.gemini/antigravity/brain/862d4c14-9400-48b0-b44b-0a2244e03f1d/uploaded_image_0_1766548354986.png`;
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            @page { size: A4; margin: 15mm; }
            body { 
                font-family: 'Helvetica', 'Arial', sans-serif; 
                margin: 0; padding: 0;
                background: white; 
                color: #000;
                font-size: 9pt;
                line-height: 1.1;
            }
            .container { width: 100%; max-width: 680px; margin: 0 auto; }
            
            /* Header Compacto */
            .rounded-box {
                border: 1.2px solid #000;
                border-radius: 15px;
                padding: 8px 12px;
                margin-bottom: 8px;
                width: 100%;
                box-sizing: border-box;
            }

            .header-box {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 110px;
                padding: 10px;
            }
            .logo-img { max-height: 100px; max-width: 100%; object-fit: contain; }

            /* Info Paciente Compacta */
            .patient-box {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                justify-content: space-between;
                font-size: 8.5pt;
                font-weight: 900;
                text-transform: uppercase;
            }
            .patient-box span { font-weight: 600; text-decoration: underline; padding: 0 4px; }

            /* Título Informe Estrecho */
            .title-box {
                text-align: center;
                font-size: 10pt;
                font-weight: 900;
                padding: 4px;
                text-transform: uppercase;
                width: 80%;
                margin: 0 auto 8px auto;
                border-radius: 12px;
            }

            /* Detalles Examen */
            .details-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 8pt;
                font-weight: 900;
                text-transform: uppercase;
                padding: 0 10px;
            }
            .details-row div span { font-weight: 600; }

            /* Tabla Técnica Estilo Referencia */
            .results-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 10px;
                border: 1.2px solid #000;
            }
            .results-table th { 
                padding: 6px; 
                border: 1.2px solid #000; 
                background: #fff; 
                font-weight: 900; 
                font-size: 8.5pt; 
                text-transform: uppercase;
            }
            .results-table td { 
                padding: 5px 8px; 
                border: 1.2px solid #000; 
                font-size: 9pt; 
                text-align: center; 
            }
            .text-left { text-align: left !important; }

            /* Observaciones */
            .obs-section {
                padding: 5px 10px;
                font-size: 9pt;
                margin-top: 5px;
            }
            .obs-title { font-weight: 900; text-decoration: underline; margin-bottom: 3px; }
            .obs-text { white-space: pre-wrap; font-weight: 600; line-height: 1.3; }

            /* Firma Centralizada */
            .signature-area {
                margin-top: 30px;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
            }
            .sig-line {
                width: 220px;
                border-top: 1.2px solid #000;
                margin-top: 25px;
                padding-top: 4px;
            }
            .sig-name { font-weight: 900; font-size: 9.5pt; margin-bottom: 1px; }
            .sig-info { font-size: 7.5pt; font-weight: 700; color: #333; }
        </style>
    </head>
    <body>
    <div class="container">
        <!-- Header Rounded -->
        <div class="rounded-box header-box" style="flex-direction: column; gap: 5px;">
            <img src="file://${logoPath}" class="logo-img" style="max-height: 70px;" />
            <div style="font-weight: 900; font-size: 13pt; text-align: center;">${lab_nombre}</div>
            <div style="font-size: 7.5pt; font-weight: 700; text-align: center; opacity: 0.8;">
                ${lab_direccion} <br/>
                ${lab_sedes}
            </div>
        </div>

        <!-- Patient Box -->
        <div class="rounded-box patient-box">
            <div>NOMBRE: <span>${patient.nombres} ${patient.apellidos}</span></div>
            <div>C.I.: <span>${patient.cedula}</span></div>
            <div>SEXO: <span>${patient.sexo}</span></div>
            <div>EDAD: <span>${edad || patient.edad} AÑOS</span></div>
            <div>FECHA: <span>${(/* @__PURE__ */ new Date()).toLocaleDateString("es-VE")}</span></div>
        </div>

        <!-- Informe Title -->
        <div class="rounded-box title-box" style="background: #eee;">
            INFORME DE RESULTADOS
        </div>

        <!-- Details Row -->
        <div class="details-row">
            <div>ESTUDIO: <span>${examName}</span></div>
            <div>MUESTRA: <span>${data.sample || "SANGRE / SUERO"}</span></div>
        </div>

        <table class="results-table">
            <thead>
                <tr>
                    <th class="text-left" style="width: 40%;">ANÁLISIS</th>
                    <th style="width: 20%;">RESULTADO</th>
                    <th style="width: 15%;">UNIDAD</th>
                    <th style="width: 25%;">REFERENCIA</th>
                </tr>
            </thead>
            <tbody>
                ${results.map((r) => `
                    <tr>
                        <td class="text-left" style="font-weight: 900;">${r.nombre}</td>
                        <td style="font-weight: 900;">${r.value || "-"}</td>
                        <td>${r.unidad || "-"}</td>
                        <td style="font-size: 7.5pt;">${r.valor_min !== null && r.valor_min !== void 0 ? `${r.valor_min} - ${r.valor_max}` : r.interpretacion || "-"}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>

        <!-- Observations -->
        ${showObservations && generalObservation ? `
        <div class="obs-section">
            <div class="obs-title">OBSERVACIONES</div>
            <div class="obs-text">${generalObservation}</div>
        </div>
        ` : ""}

        <!-- Footer -->
        <div class="signature-area">
            <div class="sig-line">
                <div class="sig-name">${prof_nombre}</div>
                <div class="sig-info">${prof_titulo}</div>
                <div class="sig-info">C.I.: ${prof_cedula} | MSDS: 11330 / C.B.Z.: 2122</div>
            </div>
        </div>
    </div>
    </body>
    </html>
    `;
};
exports.generateReportHTML = generateReportHTML;
//# sourceMappingURL=pdfTemplate.js.map
