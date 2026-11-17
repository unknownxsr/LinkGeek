; Linkgeek: NSIS installer additions (package.json → build.nsis.include).
;
; 1. An "Options" page (after the folder choice) with two choices:
;      - a shortcut on the Desktop (ticked by default)
;      - start Linkgeek with Windows, hidden in the notification area (ticked by default)
;    In silent mode (/S) the page is skipped: Desktop shortcut kept, startup choice unchanged.
;
; 2. Linkgeek.exe is never modified after the build ("signAndEditExecutable": false): editing it
;    breaks Electron's signature and Windows Smart App Control then blocks it. So the exe keeps
;    Electron's icon, and the Linkgeek logo is put on the shortcuts instead.
;    customInstall runs right after electron-builder has created the shortcuts: they are made
;    again, same target, with the logo (resources\app\assets\icon.ico) and the same
;    AppUserModelID as the window (app.setAppUserModelId), so the taskbar groups them together.

; ---- Options page (installer only: the uninstaller build never inserts this macro) ----
!macro customPageAfterChangeDir
  !include nsDialogs.nsh
  Var lgDesktop        ; ${BST_CHECKED} / ${BST_UNCHECKED}, "" when the page was not shown (silent)
  Var lgStartup
  Var lgDesktopBox
  Var lgStartupBox

  Page custom lgOptionsShow lgOptionsLeave

  Function lgOptionsShow
    !insertmacro MUI_HEADER_TEXT "Options" "Choisis comment installer Linkgeek."
    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}
    ${If} $lgDesktop == ""
      StrCpy $lgDesktop ${BST_CHECKED}
    ${EndIf}
    ${If} $lgStartup == ""
      StrCpy $lgStartup ${BST_CHECKED}
    ${EndIf}

    ${NSD_CreateCheckbox} 0 6u 100% 12u "Créer un raccourci sur le Bureau"
    Pop $lgDesktopBox
    ${NSD_SetState} $lgDesktopBox $lgDesktop

    ${NSD_CreateCheckbox} 0 30u 100% 12u "Lancer Linkgeek au démarrage de l'ordinateur"
    Pop $lgStartupBox
    ${NSD_SetState} $lgStartupBox $lgStartup
    ${NSD_CreateLabel} 12u 44u 95% 30u "Linkgeek démarre discrètement dans la zone de notification pour suivre ton temps de jeu en continu, quel que soit le launcher utilisé. Tu peux changer ça à tout moment dans Paramètres → Général."
    Pop $0

    nsDialogs::Show
  FunctionEnd

  Function lgOptionsLeave
    ${NSD_GetState} $lgDesktopBox $lgDesktop
    ${NSD_GetState} $lgStartupBox $lgStartup
  FunctionEnd
!macroend

; ---- Shortcuts with the logo + the two options ----
!macro linkgeekShortcut LINK ARGS
  Delete "${LINK}"
  CreateShortCut "${LINK}" "$appExe" "${ARGS}" "$INSTDIR\resources\app\assets\icon.ico" 0 "" "" "${APP_DESCRIPTION}"
  ClearErrors
  WinShell::SetLnkAUMI "${LINK}" "${APP_ID}"
!macroend

!macro customInstall
  ${if} ${FileExists} "$newStartMenuLink"
    !insertmacro linkgeekShortcut "$newStartMenuLink" ""
  ${endif}

  ; Desktop shortcut: removed if the box was unticked, otherwise given the logo
  ${if} $lgDesktop == ${BST_UNCHECKED}
    Delete "$newDesktopLink"
  ${elseif} ${FileExists} "$newDesktopLink"
    !insertmacro linkgeekShortcut "$newDesktopLink" ""
  ${endif}

  ; Start with Windows: same shortcut as Paramètres → Général ("--hidden" = straight to the tray)
  ${if} $lgStartup == ${BST_CHECKED}
    !insertmacro linkgeekShortcut "$SMSTARTUP\${PRODUCT_NAME}.lnk" "--hidden"
  ${elseif} $lgStartup == ${BST_UNCHECKED}
    Delete "$SMSTARTUP\${PRODUCT_NAME}.lnk"
  ${endif}

  ; ask Windows to refresh its icon cache so the new logo shows right away
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

; ---- Uninstall: also remove the "start with Windows" shortcut ----
!macro customUnInstall
  ; not when the old version is removed by an update (it would lose the player's choice)
  ${ifNot} ${isUpdated}
    Delete "$SMSTARTUP\${PRODUCT_NAME}.lnk"
  ${endif}
!macroend
