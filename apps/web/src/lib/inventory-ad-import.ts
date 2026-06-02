export const INVENTORY_AD_IMPORT_SCRIPT = String.raw`# Peanut OS - Inventario de ativos via Active Directory, CIM/WMI e Hyper-V
# Execute no Windows Server PowerShell do servidor com RSAT/ActiveDirectory instalado.
# Ajuste $HyperVHosts se quiser incluir VMs de hosts Hyper-V.

param(
  [string]$OutputFolder = "C:\Temp\InventarioAD",
  [string[]]$HyperVHosts = @()
)

$ErrorActionPreference = "Continue"
$OutputCsv = Join-Path $OutputFolder "inventario_ativos_completo.csv"
New-Item -Path $OutputFolder -ItemType Directory -Force | Out-Null

Import-Module ActiveDirectory -ErrorAction Stop

$Columns = @(
  "ChaveInventario",
  "Nome",
  "NomeDNS",
  "Dominio",
  "TipoProvavel",
  "Origem",
  "EstaNoAD",
  "EstaNoHyperV",
  "ConsultadoViaCIM",
  "Online",
  "CIMStatus",
  "EnabledAD",
  "SistemaOperacionalAD",
  "VersaoSO_AD",
  "SistemaOperacionalCIM",
  "VersaoSO_CIM",
  "BuildSO_CIM",
  "IPv4_AD",
  "IPsHyperV",
  "IPsDetectados",
  "MACsHyperV",
  "Fabricante",
  "Modelo",
  "Serial",
  "OU",
  "CanonicalName",
  "DistinguishedName",
  "DescricaoAD",
  "LocalizacaoAD",
  "ManagedBy",
  "LastLogonDate",
  "PasswordLastSet",
  "CreatedAD",
  "ModifiedAD",
  "HyperVHost",
  "VMState",
  "VMGeneration",
  "VMVersion",
  "VMProcessorCount",
  "VMMemoryStartupGB",
  "VMMemoryAssignedGB",
  "VMSwitches",
  "VMStatus",
  "VMPath",
  "VMConfigurationLocation",
  "Observacoes"
)

$Assets = @{}

function New-AssetRecord {
  param([string]$Key)

  $record = [ordered]@{}
  foreach ($column in $Columns) {
    $record[$column] = ""
  }
  $record["ChaveInventario"] = $Key
  return $record
}

function Get-AssetKey {
  param([string]$Name, [string]$DnsName)

  if (![string]::IsNullOrWhiteSpace($DnsName)) {
    return $DnsName.Trim().ToLowerInvariant()
  }
  return $Name.Trim().ToLowerInvariant()
}

function Get-ProbableType {
  param([string]$OperatingSystem)

  if ($OperatingSystem -match "Server") { return "Servidor" }
  if ($OperatingSystem -match "Windows 1|Windows 10|Windows 11") { return "Estacao" }
  return "Outro"
}

function Join-List {
  param($Items)

  if ($null -eq $Items) { return "" }
  return ($Items | Where-Object { $_ } | Select-Object -Unique) -join "; "
}

function Set-AssetValue {
  param(
    [hashtable]$Record,
    [string]$Column,
    $Value
  )

  if ($null -ne $Value -and -not [string]::IsNullOrWhiteSpace([string]$Value)) {
    $Record[$Column] = [string]$Value
  }
}

$Computers = Get-ADComputer -Filter * -Properties DNSHostName,Enabled,OperatingSystem,OperatingSystemVersion,IPv4Address,CanonicalName,DistinguishedName,Description,Location,ManagedBy,LastLogonDate,PasswordLastSet,Created,Modified

foreach ($Computer in $Computers) {
  $key = Get-AssetKey -Name $Computer.Name -DnsName $Computer.DNSHostName
  if (!$Assets.ContainsKey($key)) {
    $Assets[$key] = New-AssetRecord -Key $key
  }

  $asset = $Assets[$key]
  $asset["Nome"] = $Computer.Name
  $asset["NomeDNS"] = $Computer.DNSHostName
  $asset["Dominio"] = $env:USERDNSDOMAIN
  $asset["Origem"] = "AD"
  $asset["EstaNoAD"] = "True"
  $asset["EnabledAD"] = [string]$Computer.Enabled
  $asset["SistemaOperacionalAD"] = $Computer.OperatingSystem
  $asset["VersaoSO_AD"] = $Computer.OperatingSystemVersion
  $asset["IPv4_AD"] = $Computer.IPv4Address
  $asset["TipoProvavel"] = Get-ProbableType -OperatingSystem $Computer.OperatingSystem
  $asset["CanonicalName"] = $Computer.CanonicalName
  $asset["DistinguishedName"] = $Computer.DistinguishedName
  $asset["DescricaoAD"] = $Computer.Description
  $asset["LocalizacaoAD"] = $Computer.Location
  $asset["ManagedBy"] = $Computer.ManagedBy
  $asset["LastLogonDate"] = $Computer.LastLogonDate
  $asset["PasswordLastSet"] = $Computer.PasswordLastSet
  $asset["CreatedAD"] = $Computer.Created
  $asset["ModifiedAD"] = $Computer.Modified

  $target = if ($Computer.DNSHostName) { $Computer.DNSHostName } else { $Computer.Name }
  $isOnline = Test-Connection -ComputerName $target -Count 1 -Quiet -ErrorAction SilentlyContinue
  $asset["Online"] = [string]$isOnline

  if ($isOnline) {
    try {
      $os = Get-CimInstance -ClassName Win32_OperatingSystem -ComputerName $target -ErrorAction Stop
      $bios = Get-CimInstance -ClassName Win32_BIOS -ComputerName $target -ErrorAction Stop
      $computerSystem = Get-CimInstance -ClassName Win32_ComputerSystem -ComputerName $target -ErrorAction Stop
      $network = Get-CimInstance -ClassName Win32_NetworkAdapterConfiguration -ComputerName $target -Filter "IPEnabled=True" -ErrorAction Stop

      $asset["ConsultadoViaCIM"] = "True"
      $asset["SistemaOperacionalCIM"] = $os.Caption
      $asset["VersaoSO_CIM"] = $os.Version
      $asset["BuildSO_CIM"] = $os.BuildNumber
      $asset["Fabricante"] = $computerSystem.Manufacturer
      $asset["Modelo"] = $computerSystem.Model
      $asset["Serial"] = $bios.SerialNumber
      $asset["IPsDetectados"] = Join-List ($network | ForEach-Object { $_.IPAddress } | ForEach-Object { $_ })
      $asset["CIMStatus"] = "OK"
    } catch {
      $asset["ConsultadoViaCIM"] = "False"
      $asset["CIMStatus"] = $_.Exception.Message
    }
  }
}

foreach ($HyperVHost in $HyperVHosts) {
  if ([string]::IsNullOrWhiteSpace($HyperVHost)) { continue }

  try {
    $vms = Get-VM -ComputerName $HyperVHost -ErrorAction Stop
    foreach ($vm in $vms) {
      $key = Get-AssetKey -Name $vm.Name -DnsName ""
      if (!$Assets.ContainsKey($key)) {
        $Assets[$key] = New-AssetRecord -Key $key
      }

      $asset = $Assets[$key]
      $asset["Nome"] = $vm.Name
      $asset["TipoProvavel"] = "VM Hyper-V"
      $asset["Origem"] = if ($asset["Origem"]) { $asset["Origem"] + "; Hyper-V" } else { "Hyper-V" }
      $asset["EstaNoHyperV"] = "True"
      $asset["HyperVHost"] = $HyperVHost
      $asset["VMState"] = $vm.State
      $asset["VMGeneration"] = $vm.Generation
      $asset["VMVersion"] = $vm.Version
      $asset["VMProcessorCount"] = $vm.ProcessorCount
      $asset["VMMemoryStartupGB"] = [math]::Round($vm.MemoryStartup / 1GB, 2)
      $asset["VMMemoryAssignedGB"] = [math]::Round($vm.MemoryAssigned / 1GB, 2)
      $asset["VMStatus"] = $vm.Status
      $asset["VMPath"] = $vm.Path
      $asset["VMConfigurationLocation"] = $vm.ConfigurationLocation

      try {
        $networkAdapters = Get-VMNetworkAdapter -ComputerName $HyperVHost -VMName $vm.Name -ErrorAction Stop
        $asset["IPsHyperV"] = Join-List ($networkAdapters | ForEach-Object { $_.IPAddresses } | ForEach-Object { $_ })
        $asset["MACsHyperV"] = Join-List ($networkAdapters | ForEach-Object { $_.MacAddress })
        $asset["VMSwitches"] = Join-List ($networkAdapters | ForEach-Object { $_.SwitchName })
      } catch {
        $asset["Observacoes"] = "Falha ao coletar adaptadores Hyper-V: " + $_.Exception.Message
      }
    }
  } catch {
    Write-Warning ("Falha ao consultar Hyper-V host " + $HyperVHost + ": " + $_.Exception.Message)
  }
}

$Assets.Values | ForEach-Object { [pscustomobject]$_ } | Select-Object $Columns | Export-Csv -Path $OutputCsv -NoTypeInformation -Encoding UTF8
Write-Host "Inventario gerado em: $OutputCsv"
`;

export function downloadInventoryAdScript() {
  const blob = new Blob([INVENTORY_AD_IMPORT_SCRIPT], {
    type: 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'gerar-inventario-ativos-ad.ps1';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
