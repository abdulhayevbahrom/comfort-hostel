import { useEffect, useRef, useState } from 'react'
import { Modal, Upload } from 'antd'

export function StudentPhotoField({ currentPhoto, fileList, removed, onChange, onRemoveCurrent, uploadLabel = 'Rasm tanlash', description = 'Aniq yuz rasmi, yaxshi yoritish, neytral ifoda · maksimal 5 MB' }) {
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [requestedFacing, setRequestedFacing] = useState('environment')
  const [activeFacing, setActiveFacing] = useState('environment')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const hasPhoto = Boolean(fileList.length || (currentPhoto && !removed))

  useEffect(() => {
    if (!cameraOpen) return undefined
    let cancelled = false
    const startCamera = async () => {
      const mediaDevices = navigator.mediaDevices
      if (!mediaDevices?.getUserMedia) return setCameraError('Bu brauzer kameradan foydalanishni qo‘llab-quvvatlamaydi')
      setCameraError('')
      const fallbackFacing = requestedFacing === 'environment' ? 'user' : 'environment'
      const attempts = [
        { video: { facingMode: { exact: requestedFacing } }, audio: false },
        { video: { facingMode: { exact: fallbackFacing } }, audio: false },
        { video: true, audio: false },
      ]
      for (let index = 0; index < attempts.length; index += 1) {
        try {
          let stream = await mediaDevices.getUserMedia(attempts[index])
          if (cancelled) return stream.getTracks().forEach((track) => track.stop())
          let track = stream.getVideoTracks()[0]
          let actualFacing = track?.getSettings?.().facingMode || (index === 0 ? requestedFacing : fallbackFacing)

          if (actualFacing === 'environment') {
            try {
              const devices = await mediaDevices.enumerateDevices()
              const rearCameras = devices.filter((device) => device.kind === 'videoinput' && /(back|rear|environment)/i.test(device.label) && !/(ultra|0\.5|telephoto)/i.test(device.label))
              const mainCamera = rearCameras.find((device) => /^(back|rear)( camera)?$/i.test(device.label.trim())) || rearCameras.find((device) => /main/i.test(device.label))
              if (mainCamera && mainCamera.deviceId !== track?.getSettings?.().deviceId) {
                const mainStream = await mediaDevices.getUserMedia({ video: { deviceId: { exact: mainCamera.deviceId } }, audio: false })
                stream.getTracks().forEach((item) => item.stop())
                stream = mainStream
                track = stream.getVideoTracks()[0]
                actualFacing = track?.getSettings?.().facingMode || 'environment'
              }
            } catch {
              // Qurilma asosiy linzani alohida bermasa, standart orqa kamera qoladi.
            }
            try {
              const zoom = track?.getCapabilities?.().zoom
              if (zoom && zoom.min <= 1 && zoom.max >= 1) await track.applyConstraints({ advanced: [{ zoom: 1 }] })
            } catch {
              // Ayrim brauzerlar zoom constraintini qo‘llamaydi.
            }
          }

          streamRef.current = stream
          setActiveFacing(actualFacing)
          if (videoRef.current) videoRef.current.srcObject = stream
          return undefined
        } catch {
          // Keyingi mavjud kamerani sinab ko‘ramiz.
        }
      }
      return setCameraError('Kameraga ruxsat berilmadi yoki kamera topilmadi')
    }
    startCamera()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [cameraOpen, requestedFacing])

  const capture = () => {
    const video = videoRef.current
    if (!video?.videoWidth) return setCameraError('Kamera hali tayyor emas')
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (activeFacing === 'user') {
      context.translate(canvas.width, 0)
      context.scale(-1, 1)
    }
    context.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `student-${Date.now()}.jpg`, { type: 'image/jpeg' })
      onChange([{ uid: String(Date.now()), name: file.name, status: 'done', originFileObj: file, thumbUrl: URL.createObjectURL(blob) }])
      setCameraOpen(false)
    }, 'image/jpeg', .9)
  }

  return (
    <div className="student-photo-field">
      <div className="student-photo-controls">
        {currentPhoto && !removed && !fileList.length && <div className="student-current-photo"><img src={currentPhoto.displayUrl || currentPhoto.url} alt="Talaba rasmi" /><button type="button" onClick={onRemoveCurrent}>×</button></div>}
        <Upload accept="image/jpeg,image/png,image/webp" listType="picture-card" fileList={fileList} maxCount={1} beforeUpload={() => false} onChange={({ fileList: items }) => onChange(items.slice(-1))}>{!hasPhoto ? <div className="student-upload-label"><b>+</b><span>{uploadLabel}</span></div> : null}</Upload>
        {!hasPhoto && <button className="student-camera-btn" type="button" onClick={() => { setCameraError(''); setRequestedFacing('environment'); setActiveFacing('environment'); setCameraOpen(true) }}><svg viewBox="0 0 24 24"><path d="M4 7h3l1.5-2h7L17 7h3v12H4Z"/><circle cx="12" cy="13" r="4"/></svg>Kamera</button>}
      </div>
      <small>{description}</small>
      <Modal open={cameraOpen} onCancel={() => setCameraOpen(false)} footer={null} width={640} rootClassName="student-camera-modal" title="Kameradan suratga olish">
        <div className="student-camera-view">{cameraError ? <div className="form-error">{cameraError}</div> : <video className={activeFacing === 'user' ? 'mirrored' : ''} ref={videoRef} autoPlay playsInline muted />}</div>
        <div className="student-camera-actions">
          <button type="button" className="student-switch-camera-btn" onClick={() => setRequestedFacing(activeFacing === 'environment' ? 'user' : 'environment')} aria-label="Kamerani almashtirish"><svg viewBox="0 0 24 24"><path d="M4 8V5h3M20 16v3h-3"/><path d="M5.8 15.5A7 7 0 0 0 18 17M18.2 8.5A7 7 0 0 0 6 7"/></svg>{activeFacing === 'environment' ? 'Old kameraga' : 'Orqa kameraga'}</button>
          <button type="button" className="student-capture-btn" onClick={capture}>Suratga olish</button>
        </div>
      </Modal>
    </div>
  )
}
