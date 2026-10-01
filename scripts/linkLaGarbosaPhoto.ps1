$ErrorActionPreference = 'Stop'

$env:BOARDEASE_EMAIL = Read-Host 'BoardEase admin email'
$securePassword = Read-Host 'BoardEase admin password' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $env:BOARDEASE_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    node (Join-Path $PSScriptRoot 'linkLaGarbosaPhoto.mjs')
    if ($LASTEXITCODE -ne 0) {
        throw 'Photo link was not saved. See the error above.'
    }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    Remove-Item Env:\BOARDEASE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:\BOARDEASE_EMAIL -ErrorAction SilentlyContinue
}
