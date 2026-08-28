import { useRef, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  AutoComplete,
  Button,
  DatePicker,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Segmented,
} from "antd";
import {
  useGetFacultiesQuery,
  useGetUniversitiesQuery,
  useLazyCheckStudentBlacklistQuery,
} from "../../store/baseApi";
import { StudentPhotoField } from "./StudentPhotoField";

const initialValues = {
  fullName: "",
  phone: "",
  gender: "female",
  parentPhone: "",
  depositType: "none",
  depositAmount: null,
  depositReceivedAt: null,
  university: undefined,
  faculty: undefined,
  address: "",
  course: 1,
  educationType: "daytime",
  hasTemporaryRegistration: false,
  temporaryRegistrationMonths: null,
  studentStatus: "green",
  hasTaxContract: false,
  taxContractType: "student_contract",
  disciplinaryStatus: "clear",
  disciplinaryNote: "",
  disabilityStatus: "none",
  jshr: "",
  passport: "",
  zaks: "",
};

export function StudentFormModal({
  open,
  student,
  loading,
  error,
  onClose,
  onSubmit,
}) {
  const [form] = Form.useForm();
  const { data: universityData } = useGetUniversitiesQuery();
  const { data: facultyData } = useGetFacultiesQuery();
  const [photoFiles, setPhotoFiles] = useState([]);
  const [marriageCertificateFiles, setMarriageCertificateFiles] = useState([]);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [blacklistWarning, setBlacklistWarning] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [checkBlacklist] = useLazyCheckStudentBlacklistQuery();
  const universityId = Form.useWatch("university", form);
  const disciplinaryStatus = Form.useWatch("disciplinaryStatus", form);
  const hasTemporaryRegistration = Form.useWatch(
    "hasTemporaryRegistration",
    form,
  );
  const hasTaxContract = Form.useWatch("hasTaxContract", form);
  const depositType = Form.useWatch("depositType", form);
  const gender = Form.useWatch("gender", form);
  const universities = universityData?.universities || [];
  const selectedUniversity = universities.find(
    (item) =>
      item.id === universityId ||
      item.name.toLocaleLowerCase() ===
        String(universityId || "").toLocaleLowerCase(),
  );
  const faculties = (facultyData?.faculties || []).filter(
    (item) =>
      (item.university?.id || item.university) === selectedUniversity?.id,
  );
  const prepare = (visible) => {
    if (!visible) return;
    form.setFieldsValue(
      student
        ? {
            ...student,
            educationType: student.educationType || "daytime",
            hasTemporaryRegistration: Boolean(student.hasTemporaryRegistration),
            temporaryRegistrationMonths:
              student.temporaryRegistrationMonths || null,
            studentStatus: student.studentStatus || "green",
            hasTaxContract: Boolean(student.hasTaxContract),
            taxContractType: student.hasTaxContract
              ? student.taxContractType || "student_contract"
              : undefined,
            disciplinaryStatus: student.disciplinaryStatus || "clear",
            disabilityStatus: student.disabilityStatus || "none",
            university: student.university?.name || "",
            faculty: student.faculty?.name || "",
            passport: `${student.passportSeries || ""}${student.passportNumber || ""}`,
            zaks: `${student.zaksSeries || ""}${student.zaksNumber || ""}`,
            depositType: student.depositType || "none",
            depositAmount: student.depositAmount || null,
            depositReceivedAt: student.depositReceivedAt ? dayjs(student.depositReceivedAt) : null,
          }
        : initialValues,
    );
    setPhotoFiles([]);
    setMarriageCertificateFiles([]);
    setRemovePhoto(false);
    setBlacklistWarning(null);
    setSubmitting(false);
    submittingRef.current = false;
  };
  const checkIdentity = async () => {
    const jshr = String(form.getFieldValue("jshr") || "");
    const passport = String(form.getFieldValue("passport") || "")
      .replace(/\s/g, "")
      .toUpperCase();
    if (!/^\d{14}$/.test(jshr) && !/^[A-Z]{2}\d{7}$/.test(passport))
      return setBlacklistWarning(null);
    try {
      setBlacklistWarning(await checkBlacklist({ jshr, passport }).unwrap());
    } catch {
      setBlacklistWarning(null);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      afterOpenChange={prepare}
      footer={null}
      destroyOnHidden
      width={900}
      rootClassName="student-form-modal"
      title={student ? "Talabani tahrirlash" : "Yangi talaba qo‘shish"}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        requiredMark={false}
        onFinish={async (values) => {
          if (submittingRef.current || loading) return;
          submittingRef.current = true;
          setSubmitting(true);
          const passport = String(values.passport || "")
            .replace(/\s/g, "")
            .toUpperCase();
          const zaks = String(values.zaks || "")
            .replace(/\s/g, "")
            .toUpperCase();
          const studentValues = { ...values };
          delete studentValues.passport;
          delete studentValues.zaks;
          if (values.gender === "family" && !marriageCertificateFiles.length && !student?.marriageCertificate) {
            form.setFields([{ name: "marriageCertificate", errors: ["ZAKS qog‘ozi rasmini yuklang"] }]);
            submittingRef.current = false;
            setSubmitting(false);
            return;
          }
          try {
            await onSubmit({
              values: {
                ...studentValues,
                passportSeries: passport.slice(0, 2),
                passportNumber: passport.slice(2),
                zaksSeries: zaks.slice(0, 2),
                zaksNumber: zaks.slice(2),
              },
              photoFiles,
              marriageCertificateFiles,
              removePhoto,
            });
          } finally {
            submittingRef.current = false;
            setSubmitting(false);
          }
        }}
        onValuesChange={(changed) => {
          if (Object.prototype.hasOwnProperty.call(changed, "university"))
            form.setFieldValue("faculty", undefined);
          if (changed.hasTemporaryRegistration === false)
            form.setFieldValue("temporaryRegistrationMonths", null);
          if (changed.hasTaxContract === false)
            form.setFieldValue("taxContractType", undefined);
          if (
            changed.hasTaxContract === true &&
            !form.getFieldValue("taxContractType")
          )
            form.setFieldValue("taxContractType", "student_contract");
          if (["money", "passport"].includes(changed.depositType) && !form.getFieldValue("depositReceivedAt"))
            form.setFieldValue("depositReceivedAt", dayjs());
          if (changed.depositType === "none")
            form.setFieldsValue({ depositAmount: null, depositReceivedAt: null });
        }}
      >
        <div className="student-form-grid">
          <Form.Item
            name="fullName"
            label="F.I.O"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "F.I.O ni kiriting",
              },
            ]}
          >
            <Input placeholder="Familiya, ism, sharif" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Telefon"
            rules={[
              { required: true, message: "Telefon raqamini kiriting" },
              { pattern: /^\d{9}$/, message: "Masalan: 939119572" },
            ]}
          >
            <Input maxLength={9} inputMode="numeric" placeholder="939119572" />
          </Form.Item>
          <Form.Item
            name="gender"
            label="Jinsi"
            rules={[{ required: true, message: "Jinsini tanlang" }]}
          >
            <Segmented
              className="student-gender-segmented"
              block
              options={[
                { value: "male", label: "O‘g‘il bola" },
                { value: "female", label: "Qiz bola" },
                { value: "family", label: "Oila" },
                { value: "guest", label: "Mehmon" },
              ]}
            />
          </Form.Item>
          {gender === "family" && <>
            <Form.Item name="zaks" label="ZAKS seriyasi va raqami" rules={[{ required: true, message: "ZAKS seriyasi va raqamini kiriting" }, { pattern: /^[A-Za-z]{2}\s?\d{7}$/, message: "Masalan: AA1234567" }]}>
              <Input maxLength={10} placeholder="AA1234567" onInput={(event) => { event.currentTarget.value = event.currentTarget.value.toUpperCase(); }} />
            </Form.Item>
          </>}
          <Form.Item
            name="parentPhone"
            label="Ota-onasi telefoni"
            rules={[{ pattern: /^\d{9}$/, message: "Masalan: 939119572" }]}
          >
            <Input maxLength={9} inputMode="numeric" placeholder="939119572" />
          </Form.Item>
          <Form.Item name="depositType" label="Depozit turi">
            <Segmented className="student-deposit-segmented" block options={[{ value: "none", label: "Yo‘q" }, { value: "money", label: "Pul" }, { value: "passport", label: "Pasport" }]} />
          </Form.Item>
          {depositType === "money" && <Form.Item className="student-deposit-details" label="Depozit ma’lumotlari"><div className="student-deposit-fields"><Form.Item name="depositAmount" noStyle rules={[{ required: true, message: "Summani kiriting" }]}><InputNumber min={1} precision={0} placeholder="Depozit summasi" formatter={(value) => String(value || '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={(value) => String(value || '').replace(/\D/g, '')} /></Form.Item><Form.Item name="depositReceivedAt" noStyle rules={[{ required: true, message: "Sanani tanlang" }]}><DatePicker format="DD.MM.YYYY" placeholder="Depozit olingan sana" /></Form.Item></div></Form.Item>}
          {depositType === "passport" && <Form.Item name="depositReceivedAt" label="Depozit olingan sana" rules={[{ required: true, message: "Sanani tanlang" }]}><DatePicker format="DD.MM.YYYY" style={{ width: "100%" }} /></Form.Item>}
          <Form.Item
            name="university"
            label="Universitet (ixtiyoriy)"
          >
            <AutoComplete
              allowClear
              filterOption={(input, option) =>
                String(option?.search || "")
                  .toLocaleLowerCase()
                  .includes(input.toLocaleLowerCase())
              }
              placeholder="Qidiring yoki yangi universitet nomini yozing"
              options={universities.map((item) => ({
                value: item.name,
                label: item.shortName
                  ? `${item.name} (${item.shortName})`
                  : item.name,
                search: `${item.name} ${item.shortName || ""}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="faculty"
            label="Fakultet (ixtiyoriy)"
          >
            <AutoComplete
              allowClear
              disabled={!universityId}
              filterOption={(input, option) =>
                String(option?.value || "")
                  .toLocaleLowerCase()
                  .includes(input.toLocaleLowerCase())
              }
              placeholder="Qidiring yoki yangi fakultet nomini yozing"
              options={faculties.map((item) => ({
                value: item.name,
                label: item.name,
              }))}
            />
          </Form.Item>
          <Form.Item name="address" label="Manzil">
            <Input placeholder="Doimiy yashash manzili" />
          </Form.Item>
          <Form.Item
            name="course"
            label="Kurs"
            rules={[{ required: true, message: "Kursni kiriting" }]}
          >
            <InputNumber
              min={1}
              max={6}
              precision={0}
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item
            name="educationType"
            label="Ta’lim turi / bandligi"
            rules={[
              {
                required: true,
                message: "Ta’lim turi yoki bandligini tanlang",
              },
            ]}
          >
            <Segmented
              className="student-state-segmented"
              block
              options={[
                { value: "daytime", label: "Kunduzgi" },
                { value: "evening", label: "Kechki" },
                { value: "extramural", label: "Sirtqi" },
                { value: "employed", label: "Ishlaydi" },
              ]}
            />
          </Form.Item>
          <div className="student-inline-dependent-field">
            <label>Vaqtinchalik propiska</label>
            <div>
              <Form.Item name="hasTemporaryRegistration" valuePropName="checked" noStyle>
                <Checkbox className="student-tax-contract-checkbox">Propiska qilingan</Checkbox>
              </Form.Item>
              {hasTemporaryRegistration && (
                <Form.Item
                  name="temporaryRegistrationMonths"
                  className="student-inline-months"
                  rules={[
                    { required: true, message: "Muddatni kiriting" },
                    { type: "number", min: 1, max: 12, message: "1 dan 12 oygacha kiriting" },
                  ]}
                >
                  <InputNumber min={1} max={12} precision={0} addonAfter="oy" placeholder="1–12" />
                </Form.Item>
              )}
            </div>
          </div>
          <Form.Item name="studentStatus" label="Talaba holati">
            <Segmented
              className="student-status-segmented"
              block
              options={[
                {
                  value: "green",
                  label: (
                    <span>
                      <i className="green" />
                      Qoladi
                    </span>
                  ),
                },
                {
                  value: "warning",
                  label: (
                    <span>
                      <i className="warning" />
                      50/50
                    </span>
                  ),
                },
                {
                  value: "red",
                  label: (
                    <span>
                      <i className="red" />
                      Ketadi
                    </span>
                  ),
                },
              ]}
            />
          </Form.Item>
          <div className="student-inline-dependent-field student-inline-tax-field">
            <label>Soliq tizimidagi shartnoma</label>
            <div>
              <Form.Item name="hasTaxContract" valuePropName="checked" noStyle>
                <Checkbox className="student-tax-contract-checkbox">Soliq orqali</Checkbox>
              </Form.Item>
              {hasTaxContract && (
                <Form.Item
                  name="taxContractType"
                  className="student-inline-tax-type"
                  rules={[{ required: true, message: "Shartnoma turini tanlang" }]}
                >
                  <Segmented
                    className="student-state-segmented"
                    block
                    options={[
                      { value: "student_contract", label: "Talaba SH" },
                      { value: "standard_contract", label: "Oddiy SH" },
                    ]}
                  />
                </Form.Item>
              )}
            </div>
          </div>
          {student && (
            <Form.Item name="disciplinaryStatus" label="Intizomiy holati">
              <Segmented
                className="student-state-segmented"
                block
                options={[
                  { value: "clear", label: "Muammo yo‘q" },
                  { value: "monitoring", label: "Nazoratda" },
                  { value: "blacklisted", label: "Qora ro‘yxatda" },
                ]}
              />
            </Form.Item>
          )}
          <Form.Item name="disabilityStatus" label="Nogironlik holati">
            <Segmented
              className="student-state-segmented"
              block
              options={[
                { value: "none", label: "Yo‘q" },
                { value: "has_disability", label: "Mavjud" },
              ]}
            />
          </Form.Item>
        </div>
        {student && disciplinaryStatus === "blacklisted" && (
          <Form.Item
            name="disciplinaryNote"
            label="Qora ro‘yxat sababi"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "Qora ro‘yxat sababini kiriting",
              },
            ]}
          >
            <Input.TextArea
              rows={3}
              maxLength={1000}
              showCount
              placeholder="Intizomiy holat bo‘yicha batafsil izoh"
            />
          </Form.Item>
        )}
        <div className="student-identity-grid">
          <Form.Item
            name="jshr"
            label="JSHR"
            rules={[
              {
                pattern: /^\d{14}$/,
                message: "JSHR 14 ta raqamdan iborat bo‘lsin",
              },
            ]}
          >
            <Input
              maxLength={14}
              inputMode="numeric"
              placeholder="Ixtiyoriy — 14 xonali JSHR"
              onBlur={checkIdentity}
            />
          </Form.Item>
          <Form.Item
            name="passport"
            label="Pasport (ID karta)"
            rules={[
              {
                pattern: /^[A-Za-z]{2}\s?\d{7}$/,
                message: "Masalan: AA1234567",
              },
            ]}
          >
            <Input
              maxLength={10}
              placeholder="Ixtiyoriy — AA1234567"
              onInput={(event) => {
                event.currentTarget.value =
                  event.currentTarget.value.toUpperCase();
              }}
              onBlur={checkIdentity}
            />
          </Form.Item>
        </div>
        {blacklistWarning?.blocked && (
          <Alert
            className="student-blacklist-alert"
            type="error"
            showIcon
            message="Diqqat: bu shaxs qora ro‘yxatda"
            description={blacklistWarning.reason}
          />
        )}
        <Form.Item label="Yuz rasmi">
          <StudentPhotoField
            currentPhoto={student?.photo}
            fileList={photoFiles}
            removed={removePhoto}
            onChange={(files) => {
              setPhotoFiles(files);
              setRemovePhoto(false);
            }}
            onRemoveCurrent={() => setRemovePhoto(true)}
          />
        </Form.Item>
        {gender === "family" && <Form.Item name="marriageCertificate" label="ZAKS qog‘ozi rasmi" required>
          <StudentPhotoField currentPhoto={student?.marriageCertificate} fileList={marriageCertificateFiles} removed={false} uploadLabel="Rasm yuklash" description="Hujjat to‘liq va aniq ko‘rinsin · JPG, PNG yoki WEBP · maksimal 5 MB" onChange={(files) => { setMarriageCertificateFiles(files); form.setFields([{ name: "marriageCertificate", errors: [] }]); }} onRemoveCurrent={() => {}} />
        </Form.Item>}
        {error && <div className="form-error">{error}</div>}
        <div className="student-form-actions">
          <Button
            htmlType="submit"
            loading={loading || submitting}
            disabled={loading || submitting}
            className="student-submit-btn"
          >
            {student ? "Yangilash" : "Saqlash"}
          </Button>
          <Button disabled={loading || submitting} onClick={onClose}>
            Yopish
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
