import { forwardRef, useEffect } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import { entryRules, paymentRules, duties, prohibitions, safety, penalties, emergency, contacts, reminders } from './contractRules';

const formatDate = (value) =>
  value ? dayjs(value).format("YYYY-MM-DD") : "—";

const phonePattern = /(\+998 \d{2} \d{3} \d{2} \d{2}|\b(?:101|102|103|104|1050)\b)/g;
const isPhone = /^(?:\+998 \d{2} \d{3} \d{2} \d{2}|101|102|103|104|1050)$/;

function Rules({ title, items, highlightPhones = false }) {
  return (
    <section className="contract-rule-section">
      <h3>{title}</h3>
      {items.map(([number, text], index) => (
        <p key={`${number}-${index}`}>
          <b>{number}</b>{" "}
          {highlightPhones
            ? text.split(phonePattern).map((part, partIndex) =>
                isPhone.test(part) ? <strong key={partIndex}>{part}</strong> : part,
              )
            : text}
        </p>
      ))}
    </section>
  );
}

export const ContractDocument = forwardRef(function ContractDocument(
  { contract, student, organization },
  ref,
) {
  const hostelName =
    organization?.hostelName && organization.hostelName !== "TizimPlus Hostel"
      ? organization.hostelName
      : "COMFORT HOSTEL";
  const address =
    organization?.organizationAddress || "Turon ko‘chasi 4-yo‘lak 11-uy";
  const organizationPhone = organization?.organizationPhone;
  const phone =
    organizationPhone && /^\d{9}$/.test(organizationPhone)
      ? `+998 ${organizationPhone.slice(0, 2)} ${organizationPhone.slice(2, 5)} ${organizationPhone.slice(5, 7)} ${organizationPhone.slice(7)}`
      : organizationPhone || "+998 90 450 55 52";
  const displayedNumber = String(contract.contractNumber || "").replace(/^SHARTNOMA\s*[-–]?\s*/i, "");
  const studentId = String(student.id || student._id || "");
  const faceIdCode = student.faceIdCode || (/^[a-f\d]{24}$/i.test(studentId) ? `STU${studentId.slice(-12).toUpperCase()}` : "—");
  const room = contract.room;
  const roomLocation = [
    room?.block ? `${room.block} blok` : room?.floor != null ? `${room.floor}-qavat` : null,
    room?.roomNumber ? `${room.roomNumber}-xona` : null,
    contract.bedNumber ? `${contract.bedNumber}-o‘rin` : null,
  ].filter(Boolean).join(", ") || "—";
  return (
    <div className="contract-pages" ref={ref}>
      <article className="contract-a4">
        <header className="contract-document-header">
          <div>
            <h1>“{hostelName}”</h1>
            <p>Samarqand</p>
            <p>Tel.: {phone}</p>
          </div>
        </header>
        <h2>TALABALAR YOTOQXONASIDA YASHASH BO‘YICHA KELISHUV</h2>
        <div className="contract-document-identifiers">
          <span><b>Xona:</b> {roomLocation}</span>
          <span><b>FaceID kodi:</b> {faceIdCode}</span>
        </div>
        <div className="contract-document-meta">
          <strong>№ SHARTNOMA – {displayedNumber}</strong>
          <span>{formatDate(contract.contractDate || contract.createdAt)}</span>
        </div>
        <h3 className="contract-main-title">
          “{hostelName}” talabalar yotoqxonasining ichki tartib qoidalari
        </h3>
        <p>
          “{hostelName}” talabalar yotoqxonasi (keyinchalik “Yotoqxona” deb
          yuritiladi).
        </p>
        <Rules
          title="1. Yotoqxonaga kirib-chiqish vaqtlari"
          items={entryRules}
        />
        <Rules title="2. To‘lov tartibi" items={paymentRules} />
      </article>
      <article className="contract-a4">
        <Rules
          title="3. Yotoqxonada turuvchilarning majburiyatlari"
          items={duties}
        />
      </article>
      <article className="contract-a4">
        <Rules
          title="4. Yotoqxona hududida quyidagilarni qilish qat’iyan man etiladi"
          items={prohibitions}
        />
        <Rules title="5. Xavfsizlik" items={safety} />
      </article>
      <article className="contract-a4">
        <Rules title="6. Jarimalar" items={penalties} />
        <Rules
          title="7. Yotoqxona hududida favqulodda holat yuz berganda murojaat qilinadigan xizmatlarning telefon raqamlari"
          items={emergency}
          highlightPhones
        />
        <Rules
          title="8. Yotoqxona ma’muriyatining telefon raqamlari"
          items={contacts}
          highlightPhones
        />
        <Rules title="9. Eslatma" items={reminders} />
        <p>Yotoqxona ma’muriyati</p>
      </article>
      <article className="contract-a4">
        <section>
          <h3>10. Rozilik xati</h3>
          <p>
            <b>10.1</b> Men, <b>{student.fullName}</b>, ushbu yotoqxonada
            yashash davomida yuqoridagi qoidalar bilan tanishdim va ularga rioya
            qilishga rozilik bildiraman.
          </p>
          <p className="contract-consent-sign">______________________Imzo</p>
        </section>
        <section className="contract-requisites">
          <div>
            <div>
              <b>Yashovchi talabaning F.I.Sh.</b>
              <p className="contract-fill-line">{student.fullName}</p>
              <p>
                <b>Telefoni:</b>{" "}
                <span className="contract-inline-line">
                  {student.phone || ""}
                </span>
              </p>
              <p>
                <b>Xona:</b>{" "}
                <span className="contract-inline-line">{roomLocation}</span>
              </p>
              <p>
                <b>Muddat:</b>{" "}
                <span className="contract-inline-line">
                  {formatDate(contract.startDate)} —{" "}
                  {formatDate(contract.endDate)}
                </span>
              </p>
              <p className="contract-fill-line">&nbsp;</p>
              <p>
                <b>Imzo:</b> <span className="contract-inline-line">&nbsp;</span>
              </p>
            </div>
            <div>
              <b>Otasi yoki onasining F.I.Sh.</b>
              <p className="contract-fill-line">&nbsp;</p>
              <p>
                Ushbu yotoqxonaning ichki tartib qonun-qoidalari bilan tanishdim.
                Farzandim (yaqinim, qarindoshim) ushbu yotoqxonada yotishiga
                roziman.
              </p>
              <p>
                <b>Imzo:</b> <span className="contract-inline-line">&nbsp;</span>
              </p>
            </div>
          </div>
        </section>
        <section className="contract-organization">
          <p>
            <b>Yotoqxona nomi:</b> “{hostelName}”
          </p>
          <p>
            <b>Manzil:</b> {address}
          </p>
          <p>
            <b>H/R:</b> 5614623012927729
          </p>
          <p>
            <b>Bank:</b> Asaka bank
          </p>
          <p>
            <b>MFO:</b> 00873
          </p>
          <p>
            <b>STIR:</b> 32404576180026
          </p>
          <p className="contract-director-sign">
            __________________ <b>Gafarov I.S.</b>
          </p>
        </section>
      </article>
    </div>
  );
});

export function ContractPreviewModal({
  open,
  contract,
  student,
  organization,
  onClose,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);
  if (!open || !contract) return null;
  return createPortal(
    <div
      className="contract-pdf-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Shartnomani ko‘rish"
    >
      <header className="contract-pdf-toolbar">
        <strong>Shartnomani ko‘rish</strong>
        <button type="button" onClick={onClose} aria-label="Yopish">
          ×
        </button>
      </header>
      <div className="contract-a4-scroll">
        <ContractDocument
          contract={contract}
          student={student}
          organization={organization}
        />
      </div>
    </div>,
    document.body,
  );
}
