import { forwardRef, useEffect } from "react";
import { createPortal } from "react-dom";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("uz-UZ") : "—";

export const ContractDocument = forwardRef(function ContractDocument(
  { contract, student, organization },
  ref,
) {
  const hostelName = organization?.hostelName || "TizimPlus Hostel";
  return (
    <article className="contract-a4" ref={ref}>
      <header className="contract-document-header">
        {organization?.logo && (
          <img
            src={organization.logo.displayUrl || organization.logo.url}
            alt="Tashkilot logosi"
          />
        )}
        <div>
          <h1>{hostelName}</h1>
          <p>
            {organization?.organizationAddress ||
              "Tashkilot manzili kiritilmagan"}
          </p>
          <p>Tel: {organization?.organizationPhone || "—"}</p>
        </div>
      </header>
      <h2>TALABALAR YOTOQXONASIDA YASHASH BO‘YICHA KELISHUV</h2>
      <div className="contract-document-meta">
        <strong>№ {contract.contractNumber}</strong>
        <span>{formatDate(contract.startDate)}</span>
      </div>
      <p>
        <b>Yotoqxona nomi:</b> {hostelName}
      </p>
      <p>
        Men, <b>{student.fullName}</b>, ushbu yotoqxonada yashash davomida
        quyidagi qoidalar bilan tanishdim va ularga rioya qilishga rozilik
        bildiraman.
      </p>
      <section>
        <h3>1. UMUMIY QOIDALAR</h3>
        <p>Yotoqxonada tozalik, tartib va o‘zaro hurmat saqlanadi.</p>
        <p>
          Har bir yashovchi boshqa yashovchilarning tinchligi va qulayligini
          hurmat qilishi lozim.
        </p>
        <p>Begona shaxslarni yotoqxonaga olib kirish mumkin emas.</p>
      </section>
      <section>
        <h3>2. KIRISH-CHIQISH TARTIBI</h3>
        <p>Tashqariga chiqishda imkon qadar ma’muriyatni xabardor qilaman.</p>
        <p>Kech qoladigan bo‘lsam, imkon qadar oldindan ma’lum qilaman.</p>
        <p>Telefonim doimo aloqada bo‘ladi.</p>
      </section>
      <section>
        <h3>3. XAVFSIZLIK</h3>
        <p>
          Men voyaga yetgan shaxs sifatida yotoqxona hududidan tashqaridagi
          shaxsiy harakatlarim va xavfsizligim uchun o‘zim javobgar ekanligimni
          tushunaman.
        </p>
        <p>
          Yotoqxona ma’muriyati barcha yashovchilar uchun qulay va xavfsiz
          sharoit yaratishga harakat qiladi.
        </p>
      </section>
      <section>
        <h3>4. TO‘LOV TARTIBI</h3>
        <p>Yashash uchun to‘lov oldindan amalga oshiriladi.</p>
        <p>
          To‘langan mablag‘ yashash joyini band qilish va saqlab turish uchun
          hisoblanadi.
        </p>
        <p>
          Yashovchi o‘z xohishiga ko‘ra muddatidan oldin chiqib ketgan taqdirda,
          to‘lov avtomatik ravishda qaytarilmaydi. To‘lovni qaytarish yoki qayta
          hisob-kitob qilish masalasi ma’muriyat tomonidan har bir holat alohida
          ko‘rib chiqilgan holda hal etiladi.
        </p>
      </section>
      <section>
        <h3>5. DEPOZIT TARTIBI</h3>
        <p>
          Yotoqxonaga joylashishda talaba birinchi oy uchun to‘liq yashash
          to‘lovi bilan birga 500 000 (besh yuz ming) so‘m miqdorida depozit
          to‘laydi.
        </p>
        <p>
          Depozit talabaning tanlangan yashash muddatiga rioya qilishini
          ta’minlash va yotoqxonadagi mulk hamda jihozlarni asrash maqsadida
          olinadi.
        </p>
        <p>
          Talaba kelishilgan yashash muddatini to‘liq o‘tib, yotoqxonani
          belgilangan tartibda topshirsa, ushbu depozit yashashning oxirgi oyi
          dagi to‘lovga hisoblanadi.
        </p>
        <p>
          Masalan, oylik yashash to‘lovi 1 200 000 so‘m bo‘lsa, oxirgi oy uchun
          talaba 700 000 so‘m to‘laydi, qolgan 500 000 so‘m depozit hisobidan
          qoplanadi.
        </p>
        <p>
          Talaba kelishilgan yashash muddatini tugatmasdan, o‘z xohishiga ko‘ra
          yotoqxonadan chiqib ketsa, depozit qaytarilmaydi va mavjud
          qarzdorliklarni qoplash uchun ishlatiladi.
        </p>
      </section>
      <section>
        <h3>6. YAKUNIY QOIDALAR</h3>
        <p>
          Ushbu kelishuv yotoqxonada tartib, xavfsizlik va qulay muhitni saqlash
          maqsadida tuzilgan.
        </p>
        <p>
          Men kelishuv mazmuni bilan tanishdim va undagi shartlarga roziman.
        </p>
        {contract.note && (
          <p>
            <b>Qo‘shimcha izoh:</b> {contract.note}
          </p>
        )}
      </section>
      <section className="contract-requisites">
        <h3>YASHOVCHI VA OTA-ONA (YOKI YAQIN QARINDOSH) MA’LUMOTLARI</h3>
        <div>
          <div>
            <b>Yashovchi</b>
            <p>F.I.Sh.: {student.fullName}</p>
            <p>Tel: {student.phone}</p>
            <p>
              Xona: {contract.room?.block || "—"} blok,{" "}
              {contract.room?.roomNumber || "—"}-xona
            </p>
            <p>
              Muddat: {formatDate(contract.startDate)} —{" "}
              {formatDate(contract.endDate)}
            </p>
            <span>Imzo: __________________</span>
          </div>
          <div>
            <b>Ota-ona yoki yaqin qarindosh</b>
            <p>
              Farzandim (yoki yaqinim) ushbu yotoqxonada yashashi va
              yotoqxonaning ichki tartib-qoidalari bilan tanishganimni
              tasdiqlayman.
            </p>
            <p>Tel: {student.parentPhone || "__________________"}</p>
            <p>Sana: __________________</p>
            <span>Imzo: __________________</span>
          </div>
        </div>
      </section>
    </article>
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
