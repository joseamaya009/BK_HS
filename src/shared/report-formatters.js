function xmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function plainText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll(/[^\x20-\x7E]/g, '');
}

function summaryValues(report) {
  const summary = report.summary || {};
  return {
    totalM3: Number(summary.totalM3 || 0),
    totalLiters: Number(summary.totalLiters || 0),
    totalCost: summary.totalCost == null ? null : Number(summary.totalCost),
    readingCount: Number(summary.readingCount || 0)
  };
}

function formatNumber(value, digits = 2) {
  return Number(value || 0).toLocaleString('es-CO', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function formatDate(value) {
  const [year, month, day] = String(value || '').split('-');
  return year && month && day ? `${day}/${month}/${year}` : String(value || 'No disponible');
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(entries) {
  const localFiles = [];
  const centralFiles = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = Buffer.from(entry.content, 'utf8');
    const checksum = crc32(data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    const localFile = Buffer.concat([localHeader, name, data]);
    localFiles.push(localFile);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralFiles.push(Buffer.concat([centralHeader, name]));
    offset += localFile.length;
  }

  const centralDirectory = Buffer.concat(centralFiles);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localFiles, centralDirectory, end]);
}

function excelTextCell(ref, value, style = 0) {
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

function excelNumberCell(ref, value, style = 0) {
  return `<c r="${ref}" s="${style}"><v>${Number(value || 0)}</v></c>`;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2"><numFmt numFmtId="164" formatCode="#\,##0.0000"/><numFmt numFmtId="165" formatCode="&quot;COP&quot; #\,##0.00"/></numFmts>
  <fonts count="5">
    <font><sz val="11"/><color rgb="FF1E293B"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="20"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FF0F3A6D"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FF1E293B"/><name val="Calibri"/><family val="2"/></font>
    <font><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F3A6D"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE8F1FC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFD8E1ED"/></left><right style="thin"><color rgb="FFD8E1ED"/></right><top style="thin"><color rgb="FFD8E1ED"/></top><bottom style="thin"><color rgb="FFD8E1ED"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="10">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="2" borderId="0" xfId="0"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0"><alignment vertical="center"/></xf>
    <xf numFmtId="164" fontId="3" fillId="0" borderId="1" xfId="0"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="3" fillId="0" borderId="1" xfId="0"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment wrapText="1" vertical="center"/></xf>
  </cellXfs>
</styleSheet>`;
}

function buildConsumptionExcel(report) {
  const summary = summaryValues(report);
  const generatedAt = new Date().toLocaleString('es-CO');
  const rows = [
    `<row r="1" ht="34" customHeight="1">${excelTextCell('A1', 'HidroSmart - Reporte de consumo', 1)}</row>`,
    `<row r="2" ht="22" customHeight="1">${excelTextCell('A2', `Periodo: ${formatDate(report.from)} al ${formatDate(report.to)}`, 2)}</row>`,
    `<row r="4" ht="22" customHeight="1">${excelTextCell('A4', 'Indicadores principales', 3)}</row>`,
    `<row r="5" ht="24" customHeight="1">${excelTextCell('A5', 'Consumo total', 4)}${excelNumberCell('B5', summary.totalM3, 5)}${excelTextCell('C5', 'm3', 7)}${excelTextCell('D5', 'Volumen acumulado del periodo', 7)}</row>`,
    `<row r="6" ht="24" customHeight="1">${excelTextCell('A6', 'Consumo total', 4)}${excelNumberCell('B6', summary.totalLiters, 5)}${excelTextCell('C6', 'L', 7)}${excelTextCell('D6', 'Equivalente en litros', 7)}</row>`,
    `<row r="7" ht="24" customHeight="1">${excelTextCell('A7', 'Costo estimado', 4)}${summary.totalCost == null ? excelTextCell('B7', 'No disponible', 7) : excelNumberCell('B7', summary.totalCost, 6)}${excelTextCell('C7', 'COP', 7)}${excelTextCell('D7', 'Solo cargo variable estimado', 7)}</row>`,
    `<row r="8" ht="24" customHeight="1">${excelTextCell('A8', 'Lecturas registradas', 4)}${excelNumberCell('B8', summary.readingCount, 5)}${excelTextCell('C8', 'lecturas', 7)}${excelTextCell('D8', 'Datos recibidos del dispositivo', 7)}</row>`,
    `<row r="10" ht="22" customHeight="1">${excelTextCell('A10', 'Informacion del reporte', 3)}</row>`,
    `<row r="11" ht="22" customHeight="1">${excelTextCell('A11', 'Hogar', 8)}${excelTextCell('B11', 'Hogar seleccionado', 7)}</row>`,
    `<row r="12" ht="22" customHeight="1">${excelTextCell('A12', 'Periodo inicial', 8)}${excelTextCell('B12', formatDate(report.from), 7)}</row>`,
    `<row r="13" ht="22" customHeight="1">${excelTextCell('A13', 'Periodo final', 8)}${excelTextCell('B13', formatDate(report.to), 7)}</row>`,
    `<row r="14" ht="22" customHeight="1">${excelTextCell('A14', 'Generado el', 8)}${excelTextCell('B14', generatedAt, 7)}</row>`,
    `<row r="16" ht="32" customHeight="1">${excelTextCell('A16', 'Nota: el costo es una estimacion del consumo de acueducto y no reemplaza el valor de la factura.', 9)}</row>`
  ].join('');
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols><col min="1" max="1" width="27" customWidth="1"/><col min="2" max="2" width="20" customWidth="1"/><col min="3" max="3" width="14" customWidth="1"/><col min="4" max="4" width="34" customWidth="1"/></cols>
  <sheetData>${rows}</sheetData>
  <mergeCells count="5"><mergeCell ref="A1:D1"/><mergeCell ref="A2:D2"/><mergeCell ref="A4:D4"/><mergeCell ref="A10:D10"/><mergeCell ref="A16:D16"/></mergeCells>
  <pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
</worksheet>`;
  return createZip([
    { name: '[Content_Types].xml', content: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
    { name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', content: '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Reporte de consumo" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', content: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
    { name: 'xl/styles.xml', content: buildStylesXml() },
    { name: 'xl/worksheets/sheet1.xml', content: worksheet }
  ]);
}

function pdfEscape(value) {
  return plainText(value).replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

function pdfText({ x, y, size, font = 'F1', color = '0 0 0', value }) {
  return `BT\n/${font} ${size} Tf\n${color} rg\n${x} ${y} Td\n(${pdfEscape(value)}) Tj\nET`;
}

function pdfRectangle({ x, y, width, height, fill, stroke }) {
  const operations = [];
  if (fill) operations.push(`${fill} rg`);
  if (stroke) operations.push(`${stroke} RG`, '0.7 w');
  operations.push(`${x} ${y} ${width} ${height} re`, fill && stroke ? 'B' : fill ? 'f' : 'S');
  return operations.join('\n');
}

function buildConsumptionPdf(report) {
  const summary = summaryValues(report);
  const costText = summary.totalCost == null ? 'No disponible' : `COP ${formatNumber(summary.totalCost)}`;
  const cards = [
    { x: 48, label: 'Consumo total', value: `${formatNumber(summary.totalM3, 4)} m3` },
    { x: 222, label: 'Consumo en litros', value: `${formatNumber(summary.totalLiters)} L` },
    { x: 396, label: 'Costo estimado', value: costText }
  ];
  const content = [
    pdfRectangle({ x: 0, y: 690, width: 612, height: 102, fill: '0.06 0.23 0.43' }),
    pdfText({ x: 48, y: 748, size: 21, font: 'F2', color: '1 1 1', value: 'HidroSmart - Reporte de consumo' }),
    pdfText({ x: 48, y: 724, size: 11, color: '0.86 0.93 1', value: `Periodo: ${formatDate(report.from)} al ${formatDate(report.to)}` }),
    pdfText({ x: 48, y: 658, size: 15, font: 'F2', color: '0.06 0.16 0.28', value: 'Resumen de consumo' }),
    ...cards.flatMap((card) => [
      pdfRectangle({ x: card.x, y: 566, width: 158, height: 70, fill: '0.97 0.98 0.99', stroke: '0.84 0.89 0.95' }),
      pdfText({ x: card.x + 14, y: 612, size: 9, color: '0.32 0.4 0.5', value: card.label }),
      pdfText({ x: card.x + 14, y: 586, size: 14, font: 'F2', color: '0.06 0.16 0.28', value: card.value })
    ]),
    pdfText({ x: 48, y: 518, size: 15, font: 'F2', color: '0.06 0.16 0.28', value: 'Informacion del reporte' }),
    pdfRectangle({ x: 48, y: 400, width: 516, height: 94, fill: '1 1 1', stroke: '0.84 0.89 0.95' }),
    pdfText({ x: 66, y: 464, size: 10, font: 'F2', color: '0.32 0.4 0.5', value: 'Hogar' }),
    pdfText({ x: 205, y: 464, size: 10, color: '0.06 0.16 0.28', value: 'Hogar seleccionado' }),
    pdfText({ x: 66, y: 438, size: 10, font: 'F2', color: '0.32 0.4 0.5', value: 'Lecturas registradas' }),
    pdfText({ x: 205, y: 438, size: 10, color: '0.06 0.16 0.28', value: formatNumber(summary.readingCount, 0) }),
    pdfText({ x: 66, y: 412, size: 10, font: 'F2', color: '0.32 0.4 0.5', value: 'Generado el' }),
    pdfText({ x: 205, y: 412, size: 10, color: '0.06 0.16 0.28', value: new Date().toLocaleString('es-CO') }),
    pdfRectangle({ x: 48, y: 340, width: 516, height: 38, fill: '0.93 0.97 1', stroke: '0.81 0.9 0.98' }),
    pdfText({ x: 64, y: 356, size: 9, color: '0.08 0.28 0.5', value: 'El costo es una estimacion del consumo de acueducto y no reemplaza el valor de la factura.' }),
    pdfText({ x: 48, y: 44, size: 8, color: '0.4 0.47 0.56', value: 'HidroSmart - Sistema de Monitoreo Inteligente de Agua' }),
    pdfText({ x: 542, y: 44, size: 8, color: '0.4 0.47 0.56', value: 'Pagina 1 de 1' })
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'
  ];
  const chunks = [Buffer.from('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n', 'binary')];
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(chunks.reduce((total, chunk) => total + chunk.length, 0));
    chunks.push(Buffer.from(`${index + 1} 0 obj\n${objects[index]}\nendobj\n`, 'ascii'));
  }
  const xrefOffset = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const xref = ['xref', `0 ${objects.length + 1}`, '0000000000 65535 f '];
  for (let index = 1; index < offsets.length; index += 1) {
    xref.push(`${String(offsets[index]).padStart(10, '0')} 00000 n `);
  }
  xref.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>`, `startxref\n${xrefOffset}`, '%%EOF');
  chunks.push(Buffer.from(`${xref.join('\n')}\n`, 'ascii'));
  return Buffer.concat(chunks);
}

module.exports = { buildConsumptionExcel, buildConsumptionPdf };
