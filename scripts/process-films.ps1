param(
    [string]$FilmsDir = "C:\Films",
    [string]$B2Remote = "b2:tv-qyrn"
)

$ErrorActionPreference = "Continue"

$films = Get-ChildItem -Path $FilmsDir -Filter "*.mkv" | Where-Object { $_.BaseName -notmatch "_encoded$" }

if (!$films) {
    Write-Host "Aucun film MKV trouve dans $FilmsDir"
    exit 1
}

Write-Host "=== $($films.Count) film(s) a traiter ===`n"

foreach ($film in $films) {
    $id   = $film.BaseName
    $src  = $film.FullName
    $vtt  = "$FilmsDir\$id.fr.vtt"
    $enc  = "$FilmsDir\${id}_encoded.mkv"

    Write-Host "--- [$id] ---"

    # Extraction sous-titres FR
    $probeRaw = ffprobe -v quiet -print_format json -show_streams -select_streams s $src 2>$null | Out-String
    if ($probeRaw.Trim()) {
        $subStreams = ($probeRaw | ConvertFrom-Json).streams

        $frStream = $subStreams | Where-Object {
            $_.tags.language -in @("fre","fra","fr","French") -and
            $_.codec_name -in @("subrip","ass","ssa","webvtt","mov_text")
        } | Select-Object -First 1

        if ($frStream) {
            Write-Host "  SUB : stream $($frStream.index) ($($frStream.codec_name)) -> $id.fr.vtt"
            ffmpeg -y -loglevel error -i $src -map "0:$($frStream.index)" -c:s webvtt $vtt
            if ($LASTEXITCODE -ne 0) {
                Write-Host "  SUB : erreur extraction"
                $vtt = $null
            } else {
                Write-Host "  SUB : OK"
            }
        } else {
            Write-Host "  SUB : aucun sous-titre francais extractible"
            $vtt = $null
        }
    } else {
        Write-Host "  SUB : impossible de lire les streams"
        $vtt = $null
    }

    # Encodage h264_nvenc
    Write-Host "  ENC : h264_nvenc CQ22..."
    ffmpeg -y -loglevel error -i $src -map 0:v:0 -map 0:a:0 -c:v h264_nvenc -rc:v vbr -cq:v 22 -b:v 0 -maxrate:v 6000k -preset p4 -c:a aac -b:a 192k -ac 2 $enc

    if ($LASTEXITCODE -ne 0 -or !(Test-Path $enc)) {
        Write-Host "  ENC : erreur - source conservee"
        if (Test-Path $enc) { Remove-Item $enc }
    } else {
        $srcGB = [math]::Round($film.Length / 1GB, 2)
        $encGB = [math]::Round((Get-Item $enc).Length / 1GB, 2)
        Write-Host "  ENC : OK ($srcGB GB -> $encGB GB)"
        [System.IO.File]::Delete($src)
        [System.IO.File]::Move($enc, $src)
    }

    # Upload film
    Write-Host "  UP  : film..."
    rclone copyto $src "$B2Remote/films/$id.mkv"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  UP  : ERREUR upload film - film ignore"
        Write-Host ""
        continue
    }
    Write-Host "  UP  : film OK"

    # Upload sous-titre
    if ($vtt -and (Test-Path $vtt)) {
        Write-Host "  UP  : sous-titre..."
        rclone copyto $vtt "$B2Remote/subs/$id.fr.vtt"
        if ($LASTEXITCODE -eq 0) { Write-Host "  UP  : sub OK" }
        else { Write-Host "  UP  : ERREUR upload sub" }
    }

    Write-Host ""
}

# Cleanup versions B2
Write-Host "=== Cleanup B2 versions anciennes ==="
rclone cleanup $B2Remote
Write-Host "OK`n"

# Verification
Write-Host "=== Verification B2 ==="
$b2Films = @(rclone lsf "$B2Remote/films/" 2>$null)
$b2Subs  = @(rclone lsf "$B2Remote/subs/"  2>$null)

foreach ($film in $films) {
    $id   = $film.BaseName
    $fOk  = $b2Films -contains "$id.mkv"
    $sOk  = $b2Subs  -contains "$id.fr.vtt"
    $fMark = if ($fOk) { "OK" } else { "MANQUANT" }
    $sMark = if ($sOk) { "sub OK" } else { "pas de sub" }
    Write-Host "  $id : film=$fMark  $sMark"
}
Write-Host ""

# Suppression locale
Write-Host "=== Nettoyage local ==="
foreach ($film in $films) {
    $id        = $film.BaseName
    $localFilm = "$FilmsDir\$id.mkv"
    $localSub  = "$FilmsDir\$id.fr.vtt"

    if ($b2Films -contains "$id.mkv") {
        if (Test-Path $localFilm) { Remove-Item $localFilm; Write-Host "  Supprime $id.mkv" }
        if (Test-Path $localSub)  { Remove-Item $localSub;  Write-Host "  Supprime $id.fr.vtt" }
    } else {
        Write-Host "  SKIP $id - non confirme sur B2, fichier conserve"
    }
}

Write-Host "`n=== Termine ==="
