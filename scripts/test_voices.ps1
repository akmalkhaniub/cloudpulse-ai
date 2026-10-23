Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = $synth.GetInstalledVoices()
Write-Host "Found $($voices.Count) installed voices:"
foreach ($v in $voices) {
    Write-Host " - $($v.VoiceInfo.Name) ($($v.VoiceInfo.Culture))"
}
