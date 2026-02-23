$pgbin = "C:\Users\Acer\Desktop\pgsql\bin"
$datadir = "C:\Users\Acer\Desktop\pgsql\data"
$confFile = "$datadir\postgresql.conf"
$hbaFile = "$datadir\pg_hba.conf"

# Enable TCP/IP connections on localhost
$conf = Get-Content $confFile -Raw
if ($conf -notmatch "listen_addresses = '\*'") {
    $conf = $conf -replace "#listen_addresses = 'localhost'", "listen_addresses = '*'"
    Set-Content $confFile $conf
    Write-Host "Enabled TCP/IP listen on all addresses"
}

# Ensure pg_hba.conf allows local connections with trust
$hba = Get-Content $hbaFile -Raw
if ($hba -notmatch "host\s+all\s+all\s+127\.0\.0\.1/32\s+trust") {
    Add-Content $hbaFile "`nhost    all    all    127.0.0.1/32    trust"
    Add-Content $hbaFile "host    all    all    ::1/128         trust"
    Write-Host "Added trust auth for localhost connections"
}

# Start PostgreSQL
Write-Host "Starting PostgreSQL..."
& "$pgbin\pg_ctl.exe" -D $datadir -l "$datadir\server.log" start
Start-Sleep -Seconds 2
Write-Host "PostgreSQL started!"
