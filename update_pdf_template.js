const fs = require('fs');

const logoBase64 = fs.readFileSync('logo_base64.txt', 'utf8').trim();
const signatureBase64 = fs.readFileSync('signature_base64.txt', 'utf8').trim();

const templateContent = `export const generateReportHTML = (data: any) => {
    const { labName, doctorName, patient, results, generalObservation, examName } = data;

    const logoHtml = logoBase64 ? \`<img src="data:image/png;base64,${logoBase64}" style="width: 160px;" alt="LOGO" />\` : 'LOGO';
    const signatureHtml = signatureBase64 ? \`<img src="data:image/png;base64,${signatureBase64}" class="signature-graphic" alt="Firma" />\` : '';

    return \`
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Dancing+Script:wght@700&display=swap');
            
            body { 
                font-family: 'Roboto', 'Arial', sans-serif; 
                color: #000; 
                margin: 0; 
                padding: 40px;
                background: white; 
                -webkit-print-color-adjust: exact; 
            }
            .container { max-width: 850px; margin: 0 auto; }
            
            .rounded-box {
                border: 2.5px solid #000;
                border-radius: 20px;
                padding: 10px 20px;
                margin-bottom: 12px;
                text-align: center;
                background: #fff;
            }

            .header-grid {
                display: grid;
                grid-template-columns: 1fr 200px; 
                gap: 20px;
                margin-bottom: 20px;
                align-items: center;
            }

            .logo-placeholder {
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .lab-name-box {
                display: flex;
                flex-direction: column;
                justify-content: center;
                min-height: 110px;
                text-align: center;
            }

            .main-title {
                font-size: 22px;
                font-weight: 700;
                text-decoration: underline;
                text-transform: uppercase;
                margin-bottom: 8px;
            }

            .sub-header-info {
                font-size: 11px;
                font-weight: 700;
                line-height: 1.4;
            }

            .patient-info-grid {
                display: grid;
                grid-template-columns: 1.5fr 1fr 0.8fr 0.8fr 1.2fr;
                gap: 5px;
                font-size: 11px;
                text-align: left;
                padding: 15px 20px;
            }

            .info-label { font-weight: 700; color: #000; }
            .info-value { border-bottom: 1.5px solid #000; padding: 0 4px; display: inline-block; min-width: 40px; }

            .section-box {
                text-transform: uppercase;
                font-size: 12px;
                font-weight: 700;
                padding: 8px;
            }

            .results-header-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-top: 5px;
            }

            .result-content-container {
                min-height: 250px;
                border: 2.5px solid #000;
                border-radius: 20px;
                padding: 20px;
                margin-top: 10px;
                position: relative;
            }

            .results-table {
                width: 100%;
                border-collapse: collapse;
            }
            .results-table th {
                border-bottom: 2px solid #000;
                padding: 8px;
                font-size: 12px;
                text-align: center;
            }
            .results-table td {
                padding: 10px 8px;
                font-size: 11px;
                border-bottom: 1px solid #eee;
            }

            .footer-signature {
                margin-top: 40px;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
            }

            .signature-graphic {
                width: 180px;
                margin-bottom: -10px;
            }

            .signature-line {
                width: 300px;
                border-top: 2px solid #000;
                margin: 5px 0;
            }

            .signature-details {
                font-size: 10px;
                line-height: 1.2;
            }

            @media print {
                body { padding: 20px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header-grid">
                <div class="rounded-box lab-name-box">
                    <div class="main-title">LABORATORIO CLINICO VILLALOBOS FUENMAYOR</div>
                    <div class="sub-header-info">
                        CENTRO MEDICO MARES - C.C. TRINIDAD - C.C. FINARCA<br>
                        <span style="border-bottom: 2.5px solid #000; margin: 0 10px; padding: 0 5px;">4 BOCAS</span> - 
                        <span style="border-bottom: 2.5px solid #000; margin: 0 10px; padding: 0 5px;">NUEVA LUCHA</span> - 
                        <span style="border-bottom: 2.5px solid #000; margin: 0 10px; padding: 0 5px;">SANTA CRUZ</span>
                    </div>
                </div>
                <div class="logo-placeholder">
                    \${logoHtml}
                </div>
            </div>

            <div class="rounded-box patient-info-grid">
                <div><span class="info-label">NOMBRE:</span> <span class="info-value">\${patient.apellidos}, \${patient.nombres}</span></div>
                <div><span class="info-label">C.I:</span> <span class="info-value">\${patient.cedula}</span></div>
                <div><span class="info-label">EDAD:</span> <span class="info-value">\${patient.edad} AÑOS</span></div>
                <div><span class="info-label">SEXO:</span> <span class="info-value">\${patient.sexo}</span></div>
                <div><span class="info-label">FECHA:</span> <span class="info-value">\${new Date().toLocaleDateString()}</span></div>
            </div>

            <div class="rounded-box section-box" style="margin-top: 5px;">INFORME BACTERIOLOGICO</div>

            <div class="results-header-grid">
                <div class="rounded-box section-box" style="text-align: left;"><span class="info-label">TIPO DE INFORME:</span> DEFINITIVO</div>
                <div class="rounded-box section-box" style="text-align: left;"><span class="info-label">EXAMEN:</span> \${examName || 'ESTUDIO REALIZADO'}</div>
            </div>

            <div class="rounded-box section-box" style="margin: 10px 0 0 0; width: 30%;">RESULTADO</div>

            <div class="result-content-container">
                \${generalObservation ? \`
                    <div style="font-weight: 700; white-space: pre-wrap; font-size: 13px; margin-top: 10px;">\${generalObservation}</div>
                \` : (results.length > 0 ? \`
                    <table class="results-table">
                        <thead>
                            <tr>
                                <th style="text-align: left;">PARAMETRO</th>
                                <th>RESULTADO</th>
                                <th>UNIDAD</th>
                                <th>REF.</th>
                            </tr>
                        </thead>
                        <tbody>
                            \${results.map((r: any) => \`
                                <tr>
                                    <td style="font-weight: 700; font-size: 12px;">\${r.name}</td>
                                    <td style="text-align: center; border: 2.5px solid #000; font-weight: 700; font-size: 14px;">\${r.value}</td>
                                    <td style="text-align: center;">\${r.unit || '-'}</td>
                                    <td style="text-align: center; font-size: 10px;">\${r.reference || '-'}</td>
                                </tr>
                            \`).join('')}
                        </tbody>
                    </table>
                \` : '<div style="text-align: center; margin-top: 40px;">SIN RESULTADOS REGISTRADOS</div>')}
            </div>

            <div class="footer-signature">
                <div class="signature-container">
                    \${signatureHtml}
                </div>
                <div class="signature-line"></div>
                <div class="signature-details">
                    <div class="prof-title" style="margin-bottom: 2px;">MSc. Judith Lugo P.</div>
                    <div style="margin-bottom: 2px;">C.I.: 14.522.288 | Lic. En Bioanálisis - MSc. En Microbiología</div>
                    <div style="margin-bottom: 2px;">BACTERIOLOGO | MSDS: 11330 / C.B.Z.: 2122</div>
                    <div style="font-weight: 700; font-size: 12px; margin-top: 5px;">MSc. Judith Lugo</div>
                </div>
            </div>
        </div>
    </body>
    </html>
    \`;
};\`;

const logoSubst = 'const logoBase64 = \\'' + logoBase64 + '\\';';
const sigSubst = 'const signatureBase64 = \\'' + signatureBase64 + '\\';';

const finalContent = logoSubst + '\\n' + sigSubst + '\\n' + templateContent;

fs.writeFileSync('electron/pdfTemplate.ts', finalContent);
console.log('Template updated successfully');
