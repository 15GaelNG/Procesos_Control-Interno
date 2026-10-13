<#
  Crea la plantilla v2 de Procedimiento a partir de la plantilla institucional original.
  Requiere Microsoft Word instalado (se controla por COM; Word no se muestra).

    powershell -ExecutionPolicy Bypass -File tools\plantillas\crear-plantilla-v2.ps1

  Mismo diseño que el original (marco, portada, logo, colores, marca de agua). Cambios (ver
  docs/plantillas.md):
    1. Encabezado y pie REALES en lugar de cuadros de texto flotantes de la página 2, para que se
       repitan en todas las páginas y el sistema pueda llenarlos.
    2. Número de página automático (PÁGINA x de y).
    3. Marcadores {{...}} donde el sistema pone los datos.
    4. Secciones nuevas: Responsabilidades, Definiciones (opcionales) y Control de cambios.
    5. Letra Montserrat en lugar de Century Gothic (la «M» y la «W» de Century Gothic salen rotas en
       los PDF de Google).
#>
param(
  [string]$Origen = (Join-Path $PSScriptRoot '..\..\docs\insumos\plantilla-ciudad-maderas.docx'),
  [string]$Destino = (Join-Path $PSScriptRoot '..\..\plantillas\Procedimiento.docx')
)
$ErrorActionPreference = 'Stop'
$Origen = (Resolve-Path $Origen).Path
$Destino = [System.IO.Path]::GetFullPath($Destino)
New-Item -ItemType Directory -Force (Split-Path $Destino) | Out-Null

# Colores de la plantilla original. Word guarda los colores como BGR.
function Color($hex) { [Convert]::ToInt32($hex.Substring(4,2) + $hex.Substring(2,2) + $hex.Substring(0,2), 16) }
$AZUL_TITULO = Color '033C54'; $AZUL_TEXTO = Color '006699'; $AZUL_OSCURO = Color '06263A'
$DORADO = Color 'B4A169'; $GRIS = Color '384245'
$LETRA = 'Montserrat'

function PonerTexto($parrafo, [string]$texto) {
  $r = $parrafo.Range; [void]$r.MoveEnd(1, -1); $r.Text = $texto
}
function Reemplazar($rango, [string]$buscar, [string]$poner) {
  $f = $rango.Find; $f.ClearFormatting(); $f.Replacement.ClearFormatting()
  [void]$f.Execute($buscar, $true, $false, $false, $false, $false, $true, 0, $false, $poner, 1)
}
function Formato($parrafo, $tam, $negrita, $color, $alineacion) {
  $f = $parrafo.Range.Font; $f.Size = $tam; $f.Bold = $negrita; $f.Italic = 0; $f.Color = $color
  if ($null -ne $alineacion) { $parrafo.Alignment = $alineacion }
}
function SinEspacios($parrafo) { $parrafo.SpaceBefore = 0; $parrafo.SpaceAfter = 0; $parrafo.LeftIndent = 0; $parrafo.RightIndent = 0; $parrafo.FirstLineIndent = 0 }

$word = New-Object -ComObject Word.Application
$word.Visible = $false; $word.DisplayAlerts = 0
try {
  $d = $word.Documents.Open($Origen, $false, $true)

  # ── 1. Quitar los 14 cuadros de texto flotantes (portada, encabezado y pie de la página 2) ──
  for ($i = $d.Shapes.Count; $i -ge 1; $i--) { if ($d.Shapes.Item($i).Type -eq 17) { $d.Shapes.Item($i).Delete() } }

  # ── 2. Cuerpo (índices de la plantilla original; se trabaja de abajo hacia arriba) ──
  # Tabla de firmas: nombre, puesto y fecha de cada acción.
  $firmas = $d.Tables.Item(1)
  $claves = @('ELABORO', 'REVISO', 'AUTORIZO'); $fechas = @('FECHA_ELABORACION', 'FECHA_REVISION', 'FECHA_AUTORIZACION')
  for ($c = 1; $c -le 3; $c++) {
    $celda = $firmas.Cell(1, $c).Range
    $nombre = $celda.Paragraphs.Item(2)
    PonerTexto $nombre ('{{' + $claves[$c-1] + '_NOMBRE}}')
    # Word no deja InsertParagraphAfter en el último párrafo de una celda: los saltos van en el texto.
    $r = $nombre.Range; [void]$r.MoveEnd(1, -1)
    $r.InsertAfter("`r{{" + $claves[$c-1] + "_PUESTO}}`r{{" + $fechas[$c-1] + "}}")
    Formato $firmas.Cell(1, $c).Range.Paragraphs.Item(3) 9 0 $AZUL_OSCURO 1
    Formato $firmas.Cell(1, $c).Range.Paragraphs.Item(4) 8 0 $DORADO 1
  }
  # «05. Control y Responsables» → 8
  Reemplazar $d.Paragraphs.Item(17).Range '05' '8'

  # 7. Control de cambios: título (copia del de Desarrollo) + tabla.
  $punto = $d.Paragraphs.Item(17).Range; $punto.Collapse(1)
  $punto.FormattedText = $d.Paragraphs.Item(16).Range.FormattedText
  Reemplazar $d.Paragraphs.Item(17).Range '04' '7'
  Reemplazar $d.Paragraphs.Item(17).Range 'Desarrollo' 'Control de cambios'
  $d.Paragraphs.Item(17).Range.InsertParagraphAfter()
  $p = $d.Paragraphs.Item(18); SinEspacios $p; Formato $p 9 0 $AZUL_OSCURO 0
  $cambios = $d.Tables.Add($p.Range, 2, 4)
  $cambios.Borders.Enable = 1
  $anchos = @(62, 78, 230, 97.85)
  $titulos = @('Versión', 'Fecha', 'Descripción del cambio', 'Responsable')
  $marcas = @('{{CAMBIO_VERSION}}', '{{CAMBIO_FECHA}}', '{{CAMBIO_DESCRIPCION}}', '{{CAMBIO_RESPONSABLE}}')
  for ($c = 1; $c -le 4; $c++) {
    $cambios.Columns.Item($c).Width = [single]$anchos[$c-1]
    $t = $cambios.Cell(1, $c); $t.Range.Text = $titulos[$c-1]; $t.VerticalAlignment = 1
    Formato $t.Range.Paragraphs.Item(1) 7 1 $DORADO 1; SinEspacios $t.Range.Paragraphs.Item(1)
    $v = $cambios.Cell(2, $c); $v.Range.Text = $marcas[$c-1]; $v.VerticalAlignment = 1
    Formato $v.Range.Paragraphs.Item(1) 9 0 $AZUL_OSCURO $(if ($c -eq 3) { 0 } else { 1 }); SinEspacios $v.Range.Paragraphs.Item(1)
  }
  $cambios.Rows.Item(1).HeadingFormat = -1   # el título se repite si la tabla brinca de página

  # 6. Desarrollo: marcador debajo del título (con el formato del texto del objetivo).
  $punto = $d.Paragraphs.Item(17).Range; $punto.Collapse(1)
  $punto.FormattedText = $d.Paragraphs.Item(11).Range.FormattedText
  PonerTexto $d.Paragraphs.Item(17) '{{DESARROLLO}}'
  Reemplazar $d.Paragraphs.Item(16).Range '04' '6'

  # 4. Responsabilidades y 5. Definiciones (opcionales): copias de «2. Alcance» antes de Desarrollo.
  foreach ($seccion in @(@('4', 'Responsabilidades', '{{RESPONSABILIDADES}}'), @('5', 'Definiciones', '{{DEFINICIONES}}'))) {
    $origenRango = $d.Range($d.Paragraphs.Item(12).Range.Start, $d.Paragraphs.Item(13).Range.End)
    $i = 1; while ($d.Paragraphs.Item($i).Range.Text -notmatch '^6\. Desarrollo') { $i++ }
    $punto = $d.Paragraphs.Item($i).Range; $punto.Collapse(1)
    $punto.FormattedText = $origenRango.FormattedText
    Reemplazar $d.Paragraphs.Item($i).Range '2' $seccion[0]
    Reemplazar $d.Paragraphs.Item($i).Range 'Alcance Operativo' $seccion[1]
    PonerTexto $d.Paragraphs.Item($i + 1) $seccion[2]
  }

  # 1–3: textos de ejemplo → marcadores.
  PonerTexto $d.Paragraphs.Item(15) '{{PUESTOS}}'
  PonerTexto $d.Paragraphs.Item(13) '{{ALCANCE}}'
  PonerTexto $d.Paragraphs.Item(11) '{{OBJETIVO}}'

  # ── 3. Portada: nombre y código como párrafos (antes eran cuadros de texto) ──
  $d.Range($d.Paragraphs.Item(3).Range.Start, $d.Paragraphs.Item(8).Range.End).Delete()
  $p1 = $d.Paragraphs.Item(1); PonerTexto $p1 '{{NOMBRE_PORTADA}}'
  $p1.Range.InsertParagraphAfter()
  $p2 = $d.Paragraphs.Item(2); PonerTexto $p2 '{{CODIGO}}'
  foreach ($p in @($p1, $p2)) { SinEspacios $p; $p.LeftIndent = -1.2; $p.RightIndent = 166.9; $p.LineSpacingRule = 0 }
  Formato $p1 18 1 $GRIS 1; $p1.SpaceBefore = 229
  Formato $p2 16 1 $GRIS 1; $p2.SpaceBefore = 30

  # ── 4. Encabezado de las páginas 2 en adelante (a la derecha del logo del marco) ──
  $enc = $d.Sections.Item(1).Headers.Item(1)
  $ancla = $enc.Range.Paragraphs.Item(1)   # aquí están anclados el marco y la marca de agua
  $ancla.Range.Font.Size = 1; $ancla.LineSpacingRule = 4; $ancla.LineSpacing = 1; $ancla.SpaceAfter = 0; $ancla.SpaceBefore = 0
  for ($k = 0; $k -lt 4; $k++) { $enc.Range.Paragraphs.Item(1).Range.InsertParagraphAfter() }
  $lineas = @(
    @('{{TIPO_DOCUMENTO}}', 10, 1, $AZUL_TITULO),
    @('{{NOMBRE_DOCUMENTO}}', 12, 0, $AZUL_TEXTO),
    @('Departamento', 10, 1, $DORADO),
    @('{{DEPARTAMENTO}}', 10, 0, $AZUL_TEXTO))
  for ($k = 0; $k -lt 4; $k++) {
    $p = $enc.Range.Paragraphs.Item($k + 2)
    PonerTexto $p $lineas[$k][0]
    SinEspacios $p; $p.LeftIndent = 141.1; $p.LineSpacingRule = 4; $p.LineSpacing = 25.5
    Formato $p $lineas[$k][1] $lineas[$k][2] $lineas[$k][3] 0
  }

  # ── 5. Pie de las páginas 2 en adelante: tabla sin bordes alineada a las líneas del marco ──
  $ps = $d.Sections.Item(1).PageSetup; $ps.FooterDistance = 15
  $pie = $d.Sections.Item(1).Footers.Item(1)
  $tabla = $pie.Range.Tables.Add($pie.Range, 2, 4)
  $tabla.Borders.Enable = 0; $tabla.Rows.LeftIndent = [single]14
  $tabla.TopPadding = 0; $tabla.BottomPadding = 0; $tabla.LeftPadding = 0; $tabla.RightPadding = 0
  $anchos = @(97.6, 116.3, 143.8, 104.8)
  $titulos = @('CÓDIGO', 'VERSIÓN', 'ÚLTIMA ACTUALIZACIÓN', 'PÁGINA')
  $valores = @('{{CODIGO}}', '{{VERSION}}', '{{FECHA_ACTUALIZACION}}', '')
  for ($r = 1; $r -le 2; $r++) { $tabla.Rows.Item($r).HeightRule = 2; $tabla.Rows.Item($r).Height = [single]19.7 }
  for ($c = 1; $c -le 4; $c++) {
    $tabla.Columns.Item($c).Width = [single]$anchos[$c-1]
    $t = $tabla.Cell(1, $c); $t.Range.Text = $titulos[$c-1]; $t.VerticalAlignment = 1
    SinEspacios $t.Range.Paragraphs.Item(1); Formato $t.Range.Paragraphs.Item(1) 8 1 $AZUL_TEXTO 1
    $v = $tabla.Cell(2, $c); $v.Range.Text = $valores[$c-1]; $v.VerticalAlignment = 1
    SinEspacios $v.Range.Paragraphs.Item(1); Formato $v.Range.Paragraphs.Item(1) 8 0 $AZUL_TITULO 1
  }
  # PÁGINA: «x de y» con campos automáticos.
  $r = $tabla.Cell(2, 4).Range; [void]$r.MoveEnd(1, -1)
  [void]$d.Fields.Add($r, 33)
  $r = $tabla.Cell(2, 4).Range; [void]$r.MoveEnd(1, -1); $r.Collapse(0); $r.InsertAfter(' de '); $r.Collapse(0)
  [void]$d.Fields.Add($r, 26)
  $ultimo = $pie.Range.Paragraphs.Item($pie.Range.Paragraphs.Count)
  $ultimo.Range.Font.Size = 1; $ultimo.LineSpacingRule = 4; $ultimo.LineSpacing = 1; SinEspacios $ultimo

  # ── 6. Paginación ──
  # La original empezaba a contar en 0 (portada = 0) pero el total sí cuenta la portada: salía
  # «1 de 3» en la segunda hoja. Se cuenta parejo desde 1 (Google Docs no maneja «empezar en 0»).
  $numeros = $pie.PageNumbers; $numeros.RestartNumberingAtSection = $true; $numeros.StartingNumber = 1
  # Los títulos de sección («1. Objetivo…») nunca se quedan solos al final de la página.
  foreach ($p in $d.Paragraphs) { if ($p.Range.Text -match '^\d+\.\s') { $p.KeepWithNext = -1 } }

  # ── 7. Letra: Montserrat en todo (estilos, texto y marca de agua) ──
  foreach ($estilo in $d.Styles) { try { if ($estilo.Font.Name -eq 'Century Gothic') { $estilo.Font.Name = $LETRA } } catch {} }
  foreach ($historia in $d.StoryRanges) {
    $rango = $historia
    while ($null -ne $rango) {
      $f = $rango.Find; $f.ClearFormatting(); $f.Replacement.ClearFormatting()
      $f.Font.Name = 'Century Gothic'; $f.Replacement.Font.Name = $LETRA
      [void]$f.Execute('', $false, $false, $false, $false, $false, $true, 1, $true, '', 2)
      $rango = $rango.NextStoryRange
    }
  }
  foreach ($forma in $enc.Shapes) { if ($forma.Type -eq 15) { $forma.TextEffect.FontName = $LETRA } }
  $d.EmbedTrueTypeFonts = $false   # Ya no se incrusta Century Gothic (Montserrat la pone Google Docs)

  if (Test-Path $Destino) { Remove-Item $Destino -Force }
  $d.SaveAs2($Destino, 16)
  Write-Output "Plantilla v2 creada: $Destino"
} finally {
  # Siempre cerrar, aunque algo falle: un Word que se queda abierto en segundo plano bloquea el archivo.
  if ($d) { try { $d.Close($false) } catch {} }
  $word.Quit()
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word)
}
