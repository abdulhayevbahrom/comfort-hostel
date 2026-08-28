import { useEffect, useState } from 'react'
import './InstallPrompt.css'

const isIosDevice = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent)
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null)
  const [showIosHelp, setShowIosHelp] = useState(false)
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('pwa-install-dismissed') === 'true')
  const ios = isIosDevice()

  useEffect(() => {
    const handleInstallAvailable = (event) => {
      event.preventDefault()
      setInstallEvent(event)
    }
    const handleInstalled = () => setInstallEvent(null)

    window.addEventListener('beforeinstallprompt', handleInstallAvailable)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallAvailable)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (dismissed || isStandalone() || (!installEvent && !ios)) return null

  const dismiss = () => {
    sessionStorage.setItem('pwa-install-dismissed', 'true')
    setDismissed(true)
  }

  const install = async () => {
    if (ios) {
      setShowIosHelp(true)
      return
    }

    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === 'accepted') setInstallEvent(null)
  }

  return (
    <aside className="pwa-install" aria-label="Ilovani o‘rnatish taklifi">
      <img src="/pwa-192x192.png" alt="" className="pwa-install__icon" />
      <div className="pwa-install__content">
        <strong>Hostel ilovasini o‘rnating</strong>
        {showIosHelp ? (
          <span>Safari pastidagi <b>Ulashish</b> tugmasini, so‘ng <b>Asosiy ekranga</b> bandini bosing.</span>
        ) : (
          <span>Tez va qulay kirish uchun telefoningizga o‘rnating.</span>
        )}
      </div>
      {!showIosHelp && <button className="pwa-install__action" type="button" onClick={install}>O‘rnatish</button>}
      <button className="pwa-install__close" type="button" aria-label="Yopish" onClick={dismiss}>×</button>
    </aside>
  )
}
