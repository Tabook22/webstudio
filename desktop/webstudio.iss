; Students run WebStudio-Setup.exe. No administrator account is required.
; Websites stay in %LOCALAPPDATA%\WebStudio and are kept when the app is updated.

#define MyAppName "Web Studio"
#define MyAppVersion "2.0.0"
#ifndef DistDir
  #define DistDir "output\WebStudio"
#endif

[Setup]
AppId={{A7E3C1B4-5F20-4C8A-9D11-6B0E4F2A8C31}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=Web Studio
DefaultDirName={localappdata}\Programs\Web Studio
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=output
OutputBaseFilename=WebStudio-Setup
SetupIconFile=webstudio.ico
UninstallDisplayIcon={app}\Web Studio.exe
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes
RestartApplications=no

[Files]
Source: "{#DistDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autodesktop}\Web Studio"; Filename: "{app}\Web Studio.exe"
Name: "{autoprograms}\Web Studio"; Filename: "{app}\Web Studio.exe"

[Run]
Filename: "{app}\Web Studio.exe"; Description: "Open Web Studio"; Flags: nowait postinstall skipifsilent
