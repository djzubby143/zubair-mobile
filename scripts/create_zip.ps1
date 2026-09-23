$dest = "d:\Zubair Mobile\Zubair_Mobile_Production_Ready.zip"
$artifactDest = "C:\Users\Djzubby\.gemini\antigravity\brain\c80441e5-eabb-4bcf-9984-863969b117c0\Zubair_Mobile_Production_Ready.zip"

if (Test-Path $dest) { Remove-Item -Force $dest }

$items = Get-ChildItem -Path "d:\Zubair Mobile" | Where-Object {
    $_.Name -notmatch '^(node_modules|\.next|\.git|\.system_generated|Zubair_Mobile_Production_Ready.*)$'
}

Compress-Archive -Path $items.FullName -DestinationPath $dest -Force
Write-Host "Zip archive created: $dest (Size: $((Get-Item $dest).Length) bytes)"

Copy-Item -Path $dest -Destination $artifactDest -Force
Write-Host "Copied to artifact dir: $artifactDest (Size: $((Get-Item $artifactDest).Length) bytes)"
