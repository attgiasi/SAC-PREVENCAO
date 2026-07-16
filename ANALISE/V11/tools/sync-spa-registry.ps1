param(
  [string]$RegistryPath = (Join-Path (Split-Path $PSScriptRoot -Parent) "counterparty-registry-v11.json")
)

$ErrorActionPreference = "Stop"

$OfficialPage = "https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/lista-de-empresas/confira-a-lista-de-empresas-autorizadas-a-ofertar-apostas-de-quota-fixa-em-2025"
$NationalUrl = "https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/lista-de-empresas/planilha-de-autorizacoes.xlsx"
$JudicialUrl = "https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/lista-de-empresas/ProcessosjudiciaisSPA04.02.26.csv"
$NationalReference = "13/05/2026"
$JudicialReference = "04/02/2026"

function Normalize-Cnpj([object]$Value) {
  return ([string]$Value -replace "[^0-9A-Za-z]", "").ToUpperInvariant()
}

function Add-UniqueText([object[]]$Items, [object]$Value) {
  $text = ([string]$Value).Trim()
  if (-not $text) { return @($Items) }
  if (@($Items) -contains $text) { return @($Items) }
  return @($Items) + $text
}

function Read-ZipEntryText($Zip, [string]$Name) {
  $entry = $Zip.GetEntry($Name)
  if (-not $entry) { return "" }
  $reader = [System.IO.StreamReader]::new($entry.Open())
  try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
}

function Read-XlsxRows([string]$Path) {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
  try {
    [xml]$sharedXml = Read-ZipEntryText $zip "xl/sharedStrings.xml"
    $shared = @($sharedXml.SelectNodes('//*[local-name()="si"]') | ForEach-Object { $_.InnerText })
    foreach ($entry in $zip.Entries | Where-Object { $_.FullName -match '^xl/worksheets/sheet\d+\.xml$' }) {
      [xml]$sheet = Read-ZipEntryText $zip $entry.FullName
      foreach ($row in $sheet.SelectNodes('//*[local-name()="row"]')) {
        $values = foreach ($cell in $row.SelectNodes('./*[local-name()="c"]')) {
          $valueNode = $cell.SelectSingleNode('./*[local-name()="v"]')
          if ($cell.t -eq "s" -and $valueNode) {
            $shared[[int]$valueNode.InnerText]
          } elseif ($cell.t -eq "inlineStr") {
            $cell.InnerText
          } elseif ($valueNode) {
            $valueNode.InnerText
          } else {
            ""
          }
        }
        ,@($values)
      }
    }
  } finally {
    $zip.Dispose()
  }
}

function Read-NationalCompanies([string]$Path) {
  $companies = @{}
  foreach ($row in Read-XlsxRows $Path) {
    $cnpjIndex = -1
    for ($index = 0; $index -lt $row.Count; $index++) {
      if ((Normalize-Cnpj $row[$index]) -match '^[0-9A-Z]{12}[0-9]{2}$') {
        $cnpjIndex = $index
        break
      }
    }
    if ($cnpjIndex -lt 1) { continue }
    $cnpj = Normalize-Cnpj $row[$cnpjIndex]
    $legalName = ([string]$row[$cnpjIndex - 1]).Trim()
    if (-not $legalName) { continue }
    $brand = if ($cnpjIndex + 1 -lt $row.Count) { ([string]$row[$cnpjIndex + 1]).Trim() } else { "" }
    if (-not $companies.ContainsKey($cnpj)) {
      $companies[$cnpj] = [ordered]@{ cnpj = $cnpj; legalName = $legalName; aliases = @() }
    }
    $companies[$cnpj].aliases = Add-UniqueText $companies[$cnpj].aliases $brand
  }
  return @($companies.Values | Sort-Object cnpj)
}

function Read-JudicialCompanies([string]$Path) {
  $companies = @{}
  $currentCnpj = ""
  foreach ($line in Get-Content -LiteralPath $Path) {
    $columns = @($line -split ";", 5)
    while ($columns.Count -lt 5) { $columns += "" }
    if (([string]$columns[0]).Trim() -match '^DENOMINAÇÃO SOCIAL' -or ([string]$columns[2]).Trim() -eq "MARCAS") {
      $currentCnpj = ""
      continue
    }
    $candidate = Normalize-Cnpj $columns[1]
    if ($candidate -match '^[0-9A-Z]{12}[0-9]{2}$') {
      $currentCnpj = $candidate
      $legalName = ([string]$columns[0]).Trim()
      $companies[$currentCnpj] = [ordered]@{
        cnpj = $currentCnpj
        legalName = $legalName
        aliases = @()
        judicialInfo = ([string]$columns[4]).Trim()
      }
    }
    if ($currentCnpj -and $companies.ContainsKey($currentCnpj)) {
      $companies[$currentCnpj].aliases = Add-UniqueText $companies[$currentCnpj].aliases $columns[2]
      if (-not $companies[$currentCnpj].judicialInfo -and ([string]$columns[4]).Trim()) {
        $companies[$currentCnpj].judicialInfo = ([string]$columns[4]).Trim()
      }
    }
  }
  return @($companies.Values | Sort-Object cnpj)
}

function New-NationalRecord($Company, [string]$ReviewedAt) {
  return [ordered]@{
    id = "spa-national-$($Company.cnpj)"
    cnpj = $Company.cnpj
    scope = "EXACT"
    legalName = $Company.legalName
    aliases = @($Company.aliases)
    classification = "TRUSTED"
    directions = @("BOTH")
    issuers = @("GLOBAL")
    category = "BET_AUTHORIZED"
    reason = "CNPJ localizado na lista nacional de empresas autorizadas pela SPA."
    source = [ordered]@{ type = "SPA"; label = "Lista nacional SPA - $NationalReference"; url = $OfficialPage }
    reviewedAt = $ReviewedAt
    active = $true
    priority = 300
  }
}

function New-JudicialRecord($Company, [string]$ReviewedAt) {
  $reason = "CNPJ localizado na lista de empresas operando por decisão judicial. Revisar o contexto antes da conclusão."
  if ($Company.judicialInfo) { $reason = "$reason $($Company.judicialInfo)" }
  return [ordered]@{
    id = "spa-judicial-$($Company.cnpj)"
    cnpj = $Company.cnpj
    scope = "EXACT"
    legalName = $Company.legalName
    aliases = @($Company.aliases)
    classification = "REVIEW"
    directions = @("BOTH")
    issuers = @("GLOBAL")
    category = "BET_JUDICIAL"
    reason = $reason
    source = [ordered]@{ type = "JUDICIAL"; label = "Lista judicial SPA - $JudicialReference"; url = $OfficialPage }
    reviewedAt = $ReviewedAt
    active = $true
    priority = 250
  }
}

if (-not (Test-Path -LiteralPath $RegistryPath)) {
  throw "Registro não encontrado: $RegistryPath"
}

$temporary = Join-Path ([System.IO.Path]::GetTempPath()) "sac-spa-registry-v11"
New-Item -ItemType Directory -Force -Path $temporary | Out-Null
$nationalFile = Join-Path $temporary "autorizacoes.xlsx"
$judicialFile = Join-Path $temporary "judiciais.csv"

Invoke-WebRequest -Uri $NationalUrl -OutFile $nationalFile
Invoke-WebRequest -Uri $JudicialUrl -OutFile $judicialFile

$national = @(Read-NationalCompanies $nationalFile)
$judicial = @(Read-JudicialCompanies $judicialFile)
if (-not $national.Count) { throw "A lista nacional da SPA foi baixada, mas nenhum CNPJ foi extraído." }
if (-not $judicial.Count) { throw "A lista judicial da SPA foi baixada, mas nenhum CNPJ foi extraído." }

$registry = Get-Content -Raw -LiteralPath $RegistryPath | ConvertFrom-Json
$internal = @($registry.records | Where-Object { $_.id -notlike "spa-national-*" -and $_.id -notlike "spa-judicial-*" })
$reviewedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
$officialRecords = @(
  $national | ForEach-Object { New-NationalRecord $_ $reviewedAt }
  $judicial | ForEach-Object { New-JudicialRecord $_ $reviewedAt }
)

$registry.version = (Get-Date).ToString("yyyy.MM.dd") + ".spa"
$registry.updatedAt = $reviewedAt
$registry.records = @($internal + $officialRecords)
$json = $registry | ConvertTo-Json -Depth 12
[System.IO.File]::WriteAllText($RegistryPath, "$json`n", [System.Text.UTF8Encoding]::new($false))

[pscustomobject]@{
  Internal = $internal.Count
  National = $national.Count
  Judicial = $judicial.Count
  Total = $registry.records.Count
  Registry = $RegistryPath
} | Format-List
