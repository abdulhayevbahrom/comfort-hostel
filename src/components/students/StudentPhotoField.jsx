import { useEffect, useRef, useState } from 'react'
import { Modal, Select, Upload } from 'antd'

export function StudentPhotoField({ currentPhoto, fileList, removed, onChange, onRemoveCurrent, uploadLabel = 'Rasm tanlash', description = 'Aniq yuz rasmi, yaxshi yoritish, neytral ifoda · maksimal 5 MB' }) {
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [requestedFacing, setRequestedFacing] = useState('environment')
  const [activeFacing, setActiveFacing] = useState('environment')
  const [cameraDevices, setCameraDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [activeDeviceId, setActiveDeviceId] = useState('')
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
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null

      const getDevices = async () => {
        try {
          const devices = (await mediaDevices.enumerateDevices()).filter((device) => device.kind === 'videoinput')
          setCameraDevices(devices)
          return devices
        } catch {
          setCameraDevices([])
          return []
        }
      }

      const setStream = (stream, actualFacing = 'external') => {
        const track = stream.getVideoTracks()[0]
        streamRef.current = stream
        setActiveFacing(track?.getSettings?.().facingMode || actualFacing)
        setActiveDeviceId(track?.getSettings?.().deviceId || '')
        if (videoRef.current) videoRef.current.srcObject = stream
      }

      if (selectedDeviceId) {
        const attempts = [
          { video: { deviceId: { exact: selectedDeviceId } }, audio: false },
          { video: { deviceId: { ideal: selectedDeviceId } }, audio: false },
        ]
        for (const constraints of attempts) {
          try {
            const stream = await mediaDevices.getUserMedia(constraints)
            if (cancelled) return stream.getTracks().forEach((track) => track.stop())
            const devices = await getDevices()
            const selectedDevice = devices.find((device) => device.deviceId === selectedDeviceId)
            const actualFacing = /(front|user|facetime|integrated|built.?in)/i.test(selectedDevice?.label || '') ? 'user' : 'external'
            setStream(stream, actualFacing)
            return undefined
          } catch {
            // Keyingi constraint bilan urinib ko‘ramiz.
          }
        }
        setActiveDeviceId('')
        return setCameraError('Tanlangan kamera ochilmadi. Kamera boshqa dasturda ishlamayotganini va brauzer ruxsatini tekshiring.')
      }

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
          const devices = await getDevices()

          if (devices.length > 1) {
            const currentDeviceId = track?.getSettings?.().deviceId
            const externalCamera = devices.find((device) => /(usb|webcam|external|logitech|hd camera)/i.test(device.label) && !/(facetime|integrated|built.?in|front|back|rear|environment)/i.test(device.label))
            if (externalCamera && externalCamera.deviceId !== currentDeviceId) {
              const externalStream = await mediaDevices.getUserMedia({ video: { deviceId: { exact: externalCamera.deviceId } }, audio: false })
              stream.getTracks().forEach((item) => item.stop())
              stream = externalStream
              track = stream.getVideoTracks()[0]
              actualFacing = track?.getSettings?.().facingMode || 'external'
            }
          }

          if (actualFacing === 'environment') {
            try {
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

          setStream(stream, actualFacing)
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
  }, [cameraOpen, requestedFacing, selectedDeviceId])

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
        {!hasPhoto && <button className="student-camera-btn" type="button" onClick={() => { setCameraError(''); setSelectedDeviceId(''); setActiveDeviceId(''); setRequestedFacing('environment'); setActiveFacing('environment'); setCameraOpen(true) }}><svg viewBox="0 0 24 24"><path d="M4 7h3l1.5-2h7L17 7h3v12H4Z"/><circle cx="12" cy="13" r="4"/></svg>Kamera</button>}
      </div>
      <small>{description}</small>
      <Modal open={cameraOpen} onCancel={() => setCameraOpen(false)} footer={null} width={640} rootClassName="student-camera-modal" title="Kameradan suratga olish">
        {cameraDevices.length > 1 && (
          <Select
            className="student-camera-select"
            value={selectedDeviceId || activeDeviceId || undefined}
            placeholder="Kamerani tanlang"
            options={cameraDevices.map((device, index) => ({ value: device.deviceId, label: device.label || `Kamera ${index + 1}` }))}
            onChange={(deviceId) => { setCameraError(''); setSelectedDeviceId(deviceId) }}
          />
        )}
        <div className="student-camera-view">{cameraError ? <div className="form-error">{cameraError}</div> : <video className={activeFacing === 'user' ? 'mirrored' : ''} ref={videoRef} autoPlay playsInline muted />}</div>
        <div className="student-camera-actions">
          <button type="button" className="student-switch-camera-btn" onClick={() => { setSelectedDeviceId(''); setRequestedFacing(activeFacing === 'environment' ? 'user' : 'environment') }} aria-label="Kamerani almashtirish"><svg viewBox="0 0 24 24"><path d="M4 8V5h3M20 16v3h-3"/><path d="M5.8 15.5A7 7 0 0 0 18 17M18.2 8.5A7 7 0 0 0 6 7"/></svg>{activeFacing === 'environment' ? 'Old kameraga' : 'Orqa kameraga'}</button>
          <button type="button" className="student-capture-btn" onClick={capture}>Suratga olish</button>
        </div>
      </Modal>
    </div>
  )
}
