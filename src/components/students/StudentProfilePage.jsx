import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Image, Popconfirm, Tabs } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { toast } from "react-toastify";
import {
  apiErrorMessage,
  API_URL,
  useDeleteStudentMutation,
  useGetGeneralSettingsQuery,
  useGetStudentQuery,
  useReturnStudentDepositMutation,
  useUpdateStudentMutation,
} from "../../store/baseApi";
import { StudentFormModal } from "./StudentFormModal";
import { StudentContractsTab } from "./StudentContractsTab";
import { StudentPaymentsTab } from "./StudentPaymentsTab";
import { StudentFinesTab } from "./StudentFinesTab";
import "./StudentProfile.css";
import "./StudentFines.css";
import "./StudentFinesLayout.css";
import { canManageStudents } from "../../utils/permissions";
import { PaymentPrintIcon } from "../payments/PaymentReceiptModal";
import { printDepositReceipt } from "../payments/depositReceipt";

const genderLabel = { male: "O‘g‘il bola", female: "Qiz bola", family: "Oila", guest: "Mehmon" };
const auditValueLabels = {
  gender: genderLabel,
  educationType: { daytime: "Kunduzgi ta’lim", evening: "Kechki ta’lim", extramural: "Sirtqi ta’lim", employed: "Ishlaydi" },
  depositType: { none: "Depozit qo‘yilmagan", money: "Pul", passport: "Pasport" },
  depositPaymentMethod: { cash: "Naqd", online: "Click", card: "Karta", bank: "Bank" },
  studentStatus: { green: "Qoladi", warning: "50/50", red: "Ketadi" },
  taxContractType: { student_contract: "Talaba shartnomasi", standard_contract: "Oddiy shartnoma" },
  disciplinaryStatus: { clear: "Muammo yo‘q", monitoring: "Nazoratda", blacklisted: "Qora ro‘yxatda" },
  disabilityStatus: { none: "Yo‘q", has_disability: "Mavjud" },
  hasTemporaryRegistration: { Ha: "Qilingan", "Yo‘q": "Qilinmagan" },
  hasTaxContract: { Ha: "Mavjud", "Yo‘q": "Mavjud emas" },
};
const money = (value) => `${Number(value || 0).toLocaleString("uz-UZ")} so‘m`;
const roleLabel = { owner: "Owner", admin: "Admin", manager: "Manager", head_cashier: "Bosh kassir", cashier: "Kassir", employee: "Xodim" };

const employeeName = (employee) => {
  if (!employee) return "Noma’lum";
  const name = [employee.firstname, employee.lastname].filter(Boolean).join(" ").trim();
  return name || roleLabel[employee.role] || employee.position || "Noma’lum";
};

const auditDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const auditValue = (field, value) => {
  const text = value === undefined || value === null || value === "" ? "—" : String(value);
  return auditValueLabels[field]?.[text] || text;
};

function ProfileItem({ label, value }) {
  return (
    <div className="student-profile-item">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function PrivateStudentImage({ studentId, side, label }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let objectUrl = "";
    const controller = new AbortController();
    const token = localStorage.getItem("hostelAuthToken");
    fetch(`${API_URL}/students/${studentId}/passport-images/${side}`, { headers: token ? { authorization: `Bearer ${token}` } : {}, signal: controller.signal })
      .then((response) => response.ok ? response.blob() : null)
      .then((blob) => {
        if (!blob) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {});
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [studentId, side]);
  return src ? <Image width={96} src={src} alt={label} preview={{ mask: "Ko‘rish" }} /> : "Yuklangan";
}

function StudentAuditTab({ auditHistory = [] }) {
  const rows = [...auditHistory].sort((first, second) => new Date(second.performedAt || 0) - new Date(first.performedAt || 0));
  if (!rows.length) return <div className="student-audit-empty">Hali o‘zgarishlar tarixi yo‘q</div>;
  return (
    <div className="student-audit-tab">
      {rows.map((item) => (
        <article className="student-audit-card" key={item.id || item._id || `${item.performedAt}-${item.title}`}>
          <div className="student-audit-head">
            <div>
              <strong>{item.title || "Ma’lumot yangilandi"}</strong>
              <span>{employeeName(item.performedBy)} · {roleLabel[item.performedBy?.role] || item.performedBy?.role || "Xodim"}</span>
            </div>
            <time>{auditDate(item.performedAt)}</time>
          </div>
          <div className="student-audit-changes">
            {(item.changes || []).map((change, index) => (
              <div className="student-audit-change" key={`${change.field}-${index}`}>
                <span>{change.label}</span>
                <p><b>{auditValue(change.field, change.before)}</b><i>→</i><b>{auditValue(change.field, change.after)}</b></p>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

export function StudentProfilePage({ currentEmployee }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error: queryError } = useGetStudentQuery(id);
  const { data: settingsData } = useGetGeneralSettingsQuery();
  const [updateStudent, { isLoading: updating }] = useUpdateStudentMutation();
  const [deleteStudent, { isLoading: deleting }] = useDeleteStudentMutation();
  const [returnDeposit, { isLoading: returningDeposit }] = useReturnStudentDepositMutation();
  const [editOpen, setEditOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const student = data?.student;
  const canManage = canManageStudents(currentEmployee, settingsData?.settings);
  const depositPayments = student?.depositPayments?.length ? student.depositPayments : student?.depositType === "money" && student.depositAmount ? [{ id: `legacy-${student.id}`, amount: student.depositAmount, method: student.depositPaymentMethod || "cash", paidAt: student.depositReceivedAt }] : [];
  const depositPaid = depositPayments.filter((payment) => payment.status !== "cancelled" && !payment.cancelledAt).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const depositRequired = student?.depositType === "money" ? Math.max(Number(student.depositAmount || 0), 700000) : 0;
  const printStudentDepositReceipt = () => printDepositReceipt(student, depositPayments, settingsData?.settings);

  const update = async ({ values, photoFiles, marriageCertificateFiles, passportFrontFiles, passportBackFiles, removePhoto, removePassportFront, removePassportBack }) => {
    try {
      setFormError("");
      const body = new FormData();
      body.append("payload", JSON.stringify({ ...values, removePhoto, removePassportFront, removePassportBack }));
      if (photoFiles[0]?.originFileObj)
        body.append("photo", photoFiles[0].originFileObj);
      if (marriageCertificateFiles[0]?.originFileObj)
        body.append("marriageCertificate", marriageCertificateFiles[0].originFileObj);
      if (passportFrontFiles[0]?.originFileObj)
        body.append("passportFront", passportFrontFiles[0].originFileObj);
      if (passportBackFiles[0]?.originFileObj)
        body.append("passportBack", passportBackFiles[0].originFileObj);
      await updateStudent({ id, body }).unwrap();
      toast.success("Talaba yangilandi");
      setEditOpen(false);
    } catch (requestError) {
      const message = apiErrorMessage(requestError);
      setFormError(message);
      toast.error(message);
    }
  };

  const remove = async () => {
    try {
      await deleteStudent(id).unwrap();
      toast.success("Talaba o‘chirildi");
      navigate("/students", { replace: true });
    } catch (requestError) {
      toast.error(apiErrorMessage(requestError));
    }
  };
  const returnStudentDeposit = async () => {
    try {
      await returnDeposit(id).unwrap();
      toast.success("Depozit qaytarildi");
    } catch (requestError) {
      toast.error(apiErrorMessage(requestError));
    }
  };

  if (isLoading)
    return (
      <div className="student-profile-state">Talaba profili yuklanmoqda…</div>
    );
  if (queryError || !student)
    return (
      <div className="student-profile-state error">
        <p>{apiErrorMessage(queryError)}</p>
        <button onClick={() => navigate("/students")}>
          Talabalar ro‘yxatiga qaytish
        </button>
      </div>
    );

  return (
    <div className="student-profile-page">
      <div className="student-profile-toolbar">
        <button
          type="button"
          className="student-profile-back"
          onClick={() => navigate(-1)}
        >
          <ArrowLeftOutlined /> Orqaga
        </button>
        {canManage && <div>
          <button
            className="student-profile-edit"
            onClick={() => {
              setFormError("");
              setEditOpen(true);
            }}
          >
            <svg viewBox="0 0 24 24">
              <path d="M4 20H8L18 10L14 6L4 16V20Z" />
              <path d="M12 8L16 12" />
            </svg>
            Tahrirlash
          </button>
          <Popconfirm
            title="Talabani o‘chirish"
            description="Ushbu amalni tasdiqlaysizmi?"
            okText="O‘chirish"
            cancelText="Bekor"
            okButtonProps={{ danger: true, loading: deleting }}
            onConfirm={remove}
          >
            <button className="student-profile-delete" disabled={deleting}>
              <svg viewBox="0 0 24 24">
                <path d="M4 7H20M9 7V5H15V7M7 7L8 20H16L17 7" />
              </svg>
              O‘chirish
            </button>
          </Popconfirm>
        </div>}
      </div>
      <section className="student-profile-card">
        <div className="student-profile-head">
          <div className="student-profile-photo">
            {student.photo ? (
              <Image
                src={student.photo.displayUrl || student.photo.url}
                alt={student.fullName}
                preview={{ mask: "Ko‘rish" }}
              />
            ) : (
              <span>{student.fullName.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div>
            <small>Talaba profili</small>
            <h2>{student.fullName}</h2>
            <p>{student.university?.name || "Universitet ko‘rsatilmagan"}</p>
          </div>
          <span className={`student-profile-gender ${student.gender}`}>
            {genderLabel[student.gender]}
          </span>
        </div>
        <Tabs
          className="student-profile-tabs"
          defaultActiveKey="details"
          items={[
            {
              key: "details",
              label: "Ma’lumotlar",
              children: (
                <div>
                  <div className="student-profile-section">
                    <h3>O‘qish ma’lumotlari</h3>
                    <div className="student-profile-grid">
                      <ProfileItem
                        label="Universitet"
                        value={student.university?.name}
                      />
                      <ProfileItem
                        label="Fakultet"
                        value={student.faculty?.name}
                      />
                      <ProfileItem
                        label="Kurs"
                        value={`${student.course}-kurs`}
                      />
                    </div>
                  </div>
                  <div className="student-profile-section">
                    <h3>FaceID kirish</h3>
                    <div className="student-profile-grid">
                      <ProfileItem label="FaceID kodi" value={student.faceIdCode} />
                      <ProfileItem label="Eshik ruxsati" value={student.faceAccessEnabled ? "Faol" : "O‘chirilgan"} />
                    </div>
                  </div>
                  <div className="student-profile-section">
                    <h3>Aloqa ma’lumotlari</h3>
                    <div className="student-profile-grid">
                      <ProfileItem label="Telefon" value={student.phone} />
                      <ProfileItem label="Otasi (bobosi) telefoni" value={student.fatherPhone} />
                      <ProfileItem label="Onasi (buvisi) telefoni" value={student.motherPhone} />
                      <ProfileItem label="Manzil" value={student.address} />
                    </div>
                  </div>
                  <div className="student-profile-section">
                    <h3>Shaxsiy hujjatlar</h3>
                    <div className="student-profile-grid">
                      <ProfileItem label="JSHR" value={student.jshr} />
                      <ProfileItem
                        label="Pasport (ID karta)"
                        value={student.passportSeries && student.passportNumber ? `${student.passportSeries} ${student.passportNumber}` : "—"}
                      />
                      <ProfileItem
                        label="Pasport old rasmi"
                        value={student.passportImages?.front ? <PrivateStudentImage studentId={student.id} side="front" label="Pasport old tomoni" /> : "—"}
                      />
                      <ProfileItem
                        label="Pasport orqa rasmi"
                        value={student.passportImages?.back ? <PrivateStudentImage studentId={student.id} side="back" label="Pasport orqa tomoni" /> : "—"}
                      />
                      {student.gender === "family" && <ProfileItem
                        label="ZAKS seriyasi va raqami"
                        value={student.zaksSeries && student.zaksNumber ? `${student.zaksSeries} ${student.zaksNumber}` : "—"}
                      />}
                      {student.gender === "family" && <ProfileItem
                        label="ZAKS qog‘ozi rasmi"
                        value={student.marriageCertificate ? <Image width={96} src={student.marriageCertificate.thumbnailUrl || student.marriageCertificate.displayUrl || student.marriageCertificate.url} alt="ZAKS qog‘ozi" preview={{ mask: "Ko‘rish" }} /> : "—"}
                      />}
                    </div>
                  </div>
                  <div className="student-profile-section student-deposit-section">
                    <h3>Depozit</h3>
                    <div className="student-profile-grid student-deposit-grid">
                      <ProfileItem label="Depozit turi" value={student.depositType === "money" ? "Pul" : student.depositType === "passport" ? "Pasport" : "Depozit qo‘yilmagan"} />
                      {student.depositType === "money" && <><ProfileItem label="Depozit summasi" value={money(depositRequired)} /><ProfileItem label="To‘langan" value={money(depositPaid)} /><ProfileItem label="Depozit qarzi" value={money(Math.max(0, depositRequired - depositPaid))} /></>}
                      {student.depositType !== "none" && <ProfileItem label="Depozit olingan sana" value={student.depositReceivedAt ? new Date(student.depositReceivedAt).toLocaleDateString("uz-UZ") : "—"} />}
                      {student.depositReturnedAt && <ProfileItem label="Depozit qaytarilgan sana" value={new Date(student.depositReturnedAt).toLocaleDateString("uz-UZ")} />}
                    </div>
                    <div className="student-deposit-actions">
                      {student.depositType === "money" && depositPayments.length > 0 && <div className="student-deposit-receipts"><button onClick={printStudentDepositReceipt}><PaymentPrintIcon /><span>Umumiy depozit cheki · {money(depositPaid)}</span></button></div>}
                      {canManage && student.depositType !== "none" && !student.depositReturnedAt && <Popconfirm title="Depozit qaytarilsinmi?" description={student.depositType === "money" ? `${money(depositPaid)} qaytarilgan deb belgilanadi.` : "Pasport qaytarilgan deb belgilanadi."} okText="Qaytarish" cancelText="Bekor qilish" onConfirm={returnStudentDeposit} okButtonProps={{ loading: returningDeposit }}><button className="student-deposit-return">Depozitni qaytarish</button></Popconfirm>}
                    </div>
                  </div>
                  <div className="student-profile-section">
                    <h3>Qo‘shimcha holatlar</h3>
                    <div className="student-profile-grid">
                      <ProfileItem
                        label="Talaba holati"
                        value={
                          student.studentStatus === "red"
                            ? "Ketadi"
                            : student.studentStatus === "warning"
                              ? "50/50"
                              : "Qoladi"
                        }
                      />
                      <ProfileItem
                        label="Soliq shartnomasi"
                        value={
                          student.hasTaxContract ? "Mavjud" : "Mavjud emas"
                        }
                      />
                      <ProfileItem
                        label="Ta’lim turi / bandligi"
                        value={
                          student.educationType === "evening"
                            ? "Kechki ta’lim"
                            : student.educationType === "extramural"
                              ? "Sirtqi ta’lim"
                              : student.educationType === "employed"
                                ? "Ishlaydi"
                                : "Kunduzgi ta’lim"
                        }
                      />
                      <ProfileItem
                        label="Vaqtinchalik propiska"
                        value={student.hasTemporaryRegistration ? `Qilingan · ${student.temporaryRegistrationMonths || "—"} oy` : "Qilinmagan"}
                      />
                      {student.hasTaxContract && (
                        <ProfileItem
                          label="Soliq shartnomasi turi"
                          value={student.taxContractType === "student_contract" ? "Talaba shartnomasi" : "Oddiy shartnoma"}
                        />
                      )}
                      <ProfileItem
                        label="Intizomiy holati"
                        value={
                          student.disciplinaryStatus === "blacklisted"
                            ? "Qora ro‘yxatda"
                            : student.disciplinaryStatus === "monitoring"
                              ? "Nazoratda"
                              : "Muammo yo‘q"
                        }
                      />
                      <ProfileItem
                        label="Nogironlik holati"
                        value={
                          student.disabilityStatus === "has_disability"
                            ? "Mavjud"
                            : "Yo‘q"
                        }
                      />
                      {student.disciplinaryStatus === "blacklisted" && (
                        <ProfileItem
                          label="Qora ro‘yxat sababi"
                          value={student.disciplinaryNote}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: "contracts",
              label: "Shartnomalar",
              children: <StudentContractsTab student={student} currentEmployee={currentEmployee} />,
            },
            {
              key: "payments",
              label: "To‘lovlar",
              children: (
                <StudentPaymentsTab
                  student={student}
                  currentEmployee={currentEmployee}
                />
              ),
            },
            {
              key: "fines",
              label: "Jarimalar",
              children: <StudentFinesTab student={student} />,
            },
            {
              key: "audit",
              label: "O‘zgarishlar",
              children: <StudentAuditTab auditHistory={student.auditHistory} />,
            },
          ]}
        />
      </section>
      <StudentFormModal
        open={editOpen}
        student={student}
        loading={updating}
        error={formError}
        onClose={() => {
          setEditOpen(false);
          setFormError("");
        }}
        onSubmit={update}
      />
    </div>
  );
}
