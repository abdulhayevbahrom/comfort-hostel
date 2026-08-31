import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Image, Popconfirm, Tabs } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { toast } from "react-toastify";
import {
  apiErrorMessage,
  useDeleteStudentMutation,
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
import { canEditOrDelete } from "../../utils/permissions";

const genderLabel = { male: "O‘g‘il bola", female: "Qiz bola", family: "Oila", guest: "Mehmon" };
const money = (value) => `${Number(value || 0).toLocaleString("uz-UZ")} so‘m`;

function ProfileItem({ label, value }) {
  return (
    <div className="student-profile-item">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

export function StudentProfilePage({ currentEmployee }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error: queryError } = useGetStudentQuery(id);
  const [updateStudent, { isLoading: updating }] = useUpdateStudentMutation();
  const [deleteStudent, { isLoading: deleting }] = useDeleteStudentMutation();
  const [returnDeposit, { isLoading: returningDeposit }] = useReturnStudentDepositMutation();
  const [editOpen, setEditOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const student = data?.student;
  const canManage = canEditOrDelete(currentEmployee);

  const update = async ({ values, photoFiles, marriageCertificateFiles, removePhoto }) => {
    try {
      setFormError("");
      const body = new FormData();
      body.append("payload", JSON.stringify({ ...values, removePhoto }));
      if (photoFiles[0]?.originFileObj)
        body.append("photo", photoFiles[0].originFileObj);
      if (marriageCertificateFiles[0]?.originFileObj)
        body.append("marriageCertificate", marriageCertificateFiles[0].originFileObj);
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
                      <ProfileItem
                        label="Ota-onasi telefoni"
                        value={student.parentPhone}
                      />
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
                  <div className="student-profile-section">
                    <h3>Depozit</h3>
                    <div className="student-profile-grid">
                      <ProfileItem label="Depozit turi" value={student.depositType === "money" ? "Pul" : student.depositType === "passport" ? "Pasport" : "Depozit qo‘yilmagan"} />
                      {student.depositType === "money" && <><ProfileItem label="Depozit summasi" value={money(student.depositAmount)} /><ProfileItem label="To‘lov turi" value={{ cash: "Naqd", online: "Click", card: "Terminal", bank: "Bank" }[student.depositPaymentMethod] || "—"} /></>}
                      {student.depositType !== "none" && <ProfileItem label="Depozit olingan sana" value={student.depositReceivedAt ? new Date(student.depositReceivedAt).toLocaleDateString("uz-UZ") : "—"} />}
                      {student.depositReturnedAt && <ProfileItem label="Depozit qaytarilgan sana" value={new Date(student.depositReturnedAt).toLocaleDateString("uz-UZ")} />}
                    </div>
                    {canManage && student.depositType !== "none" && !student.depositReturnedAt && <Popconfirm title="Depozit qaytarilsinmi?" description={student.depositType === "money" ? `${money(student.depositAmount)} qaytarilgan deb belgilanadi.` : "Pasport qaytarilgan deb belgilanadi."} okText="Qaytarish" cancelText="Bekor" onConfirm={returnStudentDeposit} okButtonProps={{ loading: returningDeposit }}><button className="student-profile-edit">Depozitni qaytarish</button></Popconfirm>}
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
