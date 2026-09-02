import { useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
} from "antd";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  apiErrorMessage,
  useCreatePaymentMutation,
  useGetDebtorsQuery,
  useSendDebtorSmsMutation,
  useSetDebtorDeadlineMutation,
} from "../../store/baseApi";
import "./Debtors.css";

const money = (value) => `${Number(value || 0).toLocaleString("uz-UZ")} so‘m`;
const tableMoney = (value) => Number(value || 0).toLocaleString("uz-UZ");
const methods = { cash: "Naqd", online: "Click", bank: "Bank", card: "Karta" };

export function DebtorsPage({ currentEmployee }) {
  const navigate = useNavigate();
  const [paymentForm] = Form.useForm();
  const [period, setPeriod] = useState(dayjs().format("YYYY-MM"));
  const { data, isLoading, error } = useGetDebtorsQuery(period);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [paymentDebtor, setPaymentDebtor] = useState(null);
  const [historyDebtor, setHistoryDebtor] = useState(null);
  const [actionDebtor, setActionDebtor] = useState(null);
  const [deadlineDebtor, setDeadlineDebtor] = useState(null);
  const [deadlineForm] = Form.useForm();
  const [createPayment, { isLoading: creatingPayment }] =
    useCreatePaymentMutation();
  const [setDebtorDeadline, { isLoading: savingDeadline }] = useSetDebtorDeadlineMutation();
  const [sendDebtorSms, { isLoading: sendingSms }] = useSendDebtorSmsMutation();
  const isOwner = ["owner", "admin"].includes(currentEmployee?.role);
  const paymentMethod = Form.useWatch("method", paymentForm);
  const selectedInstallmentId = Form.useWatch("installment", paymentForm);
  const selectedPeriod = paymentDebtor?.periods.find(
    (item) => item.id === selectedInstallmentId,
  );
  const debtors = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.debtors || []).filter((item) => {
      const searchable =
        `${item.student?.fullName || ""} ${item.student?.phone || ""} ${item.student?.fatherPhone || ""} ${item.student?.motherPhone || ""} ${item.contracts?.map((contract) => contract.contractNumber).join(" ") || ""} ${item.contracts?.map((contract) => `${contract.room?.block || ""} ${contract.room?.roomNumber || ""}`).join(" ") || ""}`.toLowerCase();
      const statusMatch =
        status === "all" ||
        (status === "overdue"
          ? item.overdueDebt > 0
          : item.debtStatus === status);
      return statusMatch && (!needle || searchable.includes(needle));
    });
  }, [data?.debtors, query, status]);
  const summary = data?.summary || {};
  const openPayment = (debtor) => {
    const first = debtor.periods[0];
    setPaymentDebtor(debtor);
    paymentForm.setFieldsValue({
      installment: first?.id,
      amount: null,
      method: "cash",
      note: "",
    });
  };
  const acceptPayment = async (values) => {
    try {
      const paymentPeriod = paymentDebtor.periods.find(
        (item) => item.id === values.installment,
      );
      await createPayment({
        contract: paymentPeriod.contractId,
        installment: paymentPeriod.id,
        amount: Number(values.amount),
        method: values.method,
        note: values.note || "",
      }).unwrap();
      toast.success("To‘lov muvaffaqiyatli qabul qilindi");
      setPaymentDebtor(null);
      paymentForm.resetFields();
    } catch (requestError) {
      toast.error(apiErrorMessage(requestError));
    }
  };
  const openDeadline = (debtor) => {
    setDeadlineDebtor(debtor);
    deadlineForm.setFieldsValue({ deadline: debtor.paymentDeadline ? dayjs(debtor.paymentDeadline) : null });
  };
  const saveDeadline = async (values) => {
    try {
      await setDebtorDeadline({ studentId: deadlineDebtor.student.id, periodKey: period, deadline: values.deadline.format("YYYY-MM-DD") }).unwrap();
      toast.success("To‘lov deadline’i saqlandi");
      setDeadlineDebtor(null);
      deadlineForm.resetFields();
    } catch (requestError) { toast.error(apiErrorMessage(requestError)); }
  };
  const sendSms = async (debtor) => {
    try {
      await sendDebtorSms({ studentId: debtor.student.id, periodKey: period }).unwrap();
      toast.success(`SMS yuborildi (${(debtor.smsSentCount || 0) + 1}/3)`);
    } catch (requestError) { toast.error(apiErrorMessage(requestError)); }
  };

  return (
    <div className="debtors-page">
      <section className="debtors-hero">
        <div>
          <span>TO‘LOV NAZORATI</span>
          <h2>
            {data?.isFuturePeriod
              ? "Kutilayotgan to‘lovlar"
              : "Qarzdor talabalar"}
          </h2>
          <p>Tanlangan oy bo‘yicha to‘lov holatini nazorat qiling.</p>
        </div>
        <DatePicker
          picker="month"
          allowClear={false}
          value={dayjs(period)}
          format="MMMM YYYY"
          suffixIcon={
            <svg
              className="debtor-calendar-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M8 3v4M16 3v4M3 10h18" />
            </svg>
          }
          onChange={(date) => setPeriod(date.format("YYYY-MM"))}
        />
      </section>
      <section className="debtor-stats">
        <article className="count">
          <small>Hisoblangan (shartnoma + depozit)</small>
          <strong>{money(summary.scheduledAmount)}</strong>
        </article>
        <article className="partial">
          <small>To‘langan (shartnoma + depozit)</small>
          <strong>{money(summary.paidAmount)}</strong>
        </article>
        <article className="total">
          <small>
            {data?.isFuturePeriod ? "Kutilayotgan summa" : "Qarzdorlik"}
          </small>
          <strong>
            {money(
              data?.isFuturePeriod ? summary.waitingAmount : summary.totalDebt,
            )}
          </strong>
        </article>
        <article className="overdue">
          <small>To‘lov qilgan talabalar</small>
          <strong>{summary.paidStudentCount || 0} ta</strong>
        </article>
        <article className="unpaid">
          <small>
            {data?.isFuturePeriod ? "To‘lov kutilayotgan talabalar" : "Qarzdor talabalar"}
          </small>
          <strong>{data?.isFuturePeriod ? summary.waitingCount || 0 : summary.debtorCount || 0} ta</strong>
        </article>
      </section>
      <section className="debtors-card">
        <div className="debtors-card-head">
          <div>
            <h3>
              {data?.isFuturePeriod
                ? "To‘lov kutilayotgan talabalar"
                : "Qarzdorlar ro‘yxati"}
            </h3>
            <p>
              {debtors.length} ta natija · {period}
            </p>
          </div>
          <div className="debtor-filters">
            <div className="debtor-search">
              <svg viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" />
                <path d="m16.5 16.5 4 4" />
              </svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Talaba, telefon, xona yoki shartnoma"
              />
            </div>
            <Select
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "Barcha talabalar" },
                { value: "overdue", label: "Muddati o‘tgan" },
                { value: "partial", label: "Qisman to‘lagan" },
                { value: "unpaid", label: "Umuman to‘lamagan" },
              ]}
            />
          </div>
        </div>
        {error && <div className="form-error">{apiErrorMessage(error)}</div>}
        {isLoading ? (
          <div className="debtor-state">Ma’lumotlar yuklanmoqda…</div>
        ) : (
          <div className="debtor-table-wrap">
            <table className="debtor-table">
              <thead>
                <tr>
                  <th>Talaba</th>
                  <th>Universitet</th>
                  <th>Xona</th>
                  <th>
                    {data?.isFuturePeriod ? "To‘lov davri" : "Qarzdor davr"}
                  </th>
                  <th>
                    {data?.isFuturePeriod ? "Kutilayotgan summa" : "Jami qarz"}
                  </th>
                  <th>Muddati o‘tgan</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {debtors.map((debtor) => {
                  const room = debtor.contracts?.[0]?.room;
                  return (
                    <tr key={debtor.student.id} className={debtor.isDeadlineReached ? "debtor-deadline-reached" : ""}>
                      <td data-label="Talaba">
                        <button
                          className="debtor-student"
                          title="Talaba profilini ochish"
                          onClick={() =>
                            navigate(`/student/${debtor.student.id}`)
                          }
                        >
                          {debtor.student.photo ? (
                            <img
                              src={
                                debtor.student.photo.thumbnailUrl ||
                                debtor.student.photo.url
                              }
                              alt=""
                            />
                          ) : (
                            <span>{debtor.student.fullName?.[0]}</span>
                          )}
                          <div>
                            <strong>{debtor.student.fullName}</strong>
                            <small>{debtor.student.phone}</small>
                          </div>
                        </button>
                      </td>
                      <td data-label="Universitet">
                        <strong>
                          {debtor.student.university?.name || "—"}
                        </strong>
                        <small>
                          {debtor.student.faculty?.name || ""} ·{" "}
                          {debtor.student.course}-kurs
                        </small>
                      </td>
                      <td data-label="Xona">
                        {room ? (
                          <>
                            <strong>
                              {room.block} · {room.roomNumber}-xona
                            </strong>
                            <small>{room.floor}-qavat</small>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td data-label="Davrlar">
                        <span className="debt-period-count">
                          {debtor.depositDebt ? "Depozit" : `${debtor.periodCount} ta davr`}
                        </span>
                        <small>
                          {debtor.periods
                            .map((paymentPeriod) => paymentPeriod.periodKey)
                            .join(", ")}
                        </small>
                        {debtor.depositDebt > 0 && <small>Depozit qarzi: {money(debtor.depositDebt)}</small>}
                        {debtor.paymentDeadline && <small className="debtor-deadline-date">Deadline: {dayjs(debtor.paymentDeadline).format("DD.MM.YYYY")}</small>}
                      </td>
                      <td data-label="Summa">
                        <b className="debt-money">{tableMoney(data?.isFuturePeriod ? debtor.waitingAmount : debtor.totalDebt)}</b>
                      </td>
                      <td data-label="O‘tgan">
                        <b
                          className={debtor.overdueDebt ? "overdue-money" : ""}
                        >
                          {tableMoney(debtor.overdueDebt)}
                        </b>
                      </td>
                      <td data-label="Amal">
                        <div className="debtor-row-actions">
                          <button
                            className="debtor-pay-btn"
                            onClick={() => debtor.periods.length ? openPayment(debtor) : navigate(`/student/${debtor.student.id}`)}
                          >
                            {debtor.periods.length ? "To‘lov qilish" : "Profilga o‘tish"}
                          </button>
                          <button
                            className="debtor-history-btn"
                            onClick={() => setHistoryDebtor(debtor)}
                            title="To‘lov tarixini ko‘rish"
                          >
                            <svg viewBox="0 0 24 24">
                              <path d="M3 12a9 9 0 1 0 3-6.7" />
                              <path d="M3 4v5h5M12 7v5l3 2" />
                            </svg>
                            Tarix
                          </button>
                          <button
                            className="debtor-details-btn"
                            onClick={() => setSelected(debtor)}
                          >
                            Batafsil
                          </button>
                          {isOwner && debtor.periods.length > 0 && <button className="debtor-deadline-btn" onClick={() => openDeadline(debtor)}>Deadline</button>}
                          {isOwner && <button className="debtor-history-btn" disabled={sendingSms || debtor.smsSentCount >= 3} onClick={() => sendSms(debtor)} title={debtor.smsSentCount >= 3 ? 'SMS limiti tugagan' : 'Qarzdorlik SMSini yuborish'}>SMS ({debtor.smsSentCount || 0}/3)</button>}
                          <button className="debtor-more-btn" aria-label="Amallar" onClick={() => setActionDebtor(actionDebtor?.student?.id === debtor.student.id ? null : debtor)}>⋯</button>
                          {actionDebtor?.student?.id === debtor.student.id && <div className="debtor-inline-actions">{debtor.periods.length > 0 && <button onClick={() => { openPayment(debtor); setActionDebtor(null) }}>To‘lov</button>}<button onClick={() => { setHistoryDebtor(debtor); setActionDebtor(null) }}>Tarix</button><button onClick={() => { setSelected(debtor); setActionDebtor(null) }}>Batafsil</button>{isOwner && debtor.periods.length > 0 && <button onClick={() => { openDeadline(debtor); setActionDebtor(null) }}>Deadline</button>}</div>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!debtors.length && (
                  <tr>
                    <td colSpan="8" className="debtor-state">
                      Tanlangan oy uchun ma’lumot topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={Boolean(selected)}
        onCancel={() => setSelected(null)}
        footer={null}
        width={760}
        title={data?.isFuturePeriod ? "Kutilayotgan to‘lov tafsilotlari" : "Qarzdorlik tafsilotlari"}
        rootClassName="debtor-modal"
      >
        <>
          {selected && (
            <div className="debtor-detail">
              <div className="debtor-detail-person">
                <div>
                  <h3>{selected.student.fullName}</h3>
                  <p>
                    {selected.student.university?.name || "—"} ·{" "}
                    {selected.student.course}-kurs
                  </p>
                </div>
                <div>
                  <a href={`tel:${selected.student.phone}`}>
                    {selected.student.phone}
                  </a>
                  <a href={`tel:${selected.student.fatherPhone || selected.student.motherPhone || ""}`}>
                    {selected.student.fatherPhone || selected.student.motherPhone || "Qo‘shimcha aloqa raqami yo‘q"}
                  </a>
                </div>
              </div>
              <div className="debtor-detail-summary">
                <div>
                  <span>{data?.isFuturePeriod ? "Kutilayotgan summa" : "Jami qarz"}</span>
                  <strong>{money(data?.isFuturePeriod ? selected.waitingAmount : selected.totalDebt)}</strong>
                </div>
                <div>
                  <span>Muddati o‘tgan</span>
                  <strong>{money(selected.overdueDebt)}</strong>
                </div>
                <div>
                  <span>Joriy oy</span>
                  <strong>{money(selected.currentDebt)}</strong>
                </div>
              </div>
              <h4>{data?.isFuturePeriod ? "Kelgusi to‘lov davrlari" : "Qarzdorlik davrlari"}</h4>
              {selected.depositDebt > 0 && <div className="debtor-deposit-detail"><strong>Depozit qarzi</strong><b>{money(selected.depositDebt)}</b></div>}
              <div className="debtor-periods">
                {selected.periods.map((period) => (
                  <article key={period.id}>
                    <div>
                      <strong>{period.periodKey}</strong>
                      <span>{period.contractNumber}</span>
                    </div>
                    <div>
                      <small>Hisoblangan</small>
                      <b>{money(period.amount)}</b>
                    </div>
                    <div>
                      <small>To‘langan</small>
                      <b className="paid">{money(period.paidAmount)}</b>
                    </div>
                    <div>
                      <small>Qoldiq</small>
                      <b className="debt">{money(period.debt)}</b>
                    </div>
                    <div>
                      <small>Muddat</small>
                      <b>{dayjs(period.dueDate).format("DD.MM.YYYY")}</b>
                    </div>
                  </article>
                ))}
              </div>
              <div className="debtor-detail-actions">
                <button
                  onClick={() => navigate(`/student/${selected.student.id}`)}
                >
                  Talaba profilini ochish
                </button>
              </div>
            </div>
          )}
        </>
      </Modal>
      <Modal open={Boolean(deadlineDebtor)} onCancel={() => setDeadlineDebtor(null)} footer={null} title={deadlineDebtor ? `${deadlineDebtor.student.fullName} — to‘lov deadline’i` : "To‘lov deadline’i"} destroyOnHidden>
        <Form form={deadlineForm} layout="vertical" onFinish={saveDeadline} requiredMark={false}>
          <Form.Item name="deadline" label="To‘lov qilishi kerak bo‘lgan sana" rules={[{ required: true, message: "Sanani tanlang" }]}><DatePicker format="DD.MM.YYYY" style={{ width: "100%" }} /></Form.Item>
          <div className="debtor-payment-actions"><Button onClick={() => setDeadlineDebtor(null)}>Bekor qilish</Button><Button type="primary" htmlType="submit" loading={savingDeadline}>Saqlash</Button></div>
        </Form>
      </Modal>
      <Modal
        open={Boolean(paymentDebtor)}
        onCancel={() => setPaymentDebtor(null)}
        footer={null}
        width={580}
        title={
          paymentDebtor
            ? `${paymentDebtor.student.fullName} — to‘lov qilish`
            : "To‘lov qilish"
        }
        rootClassName="debtor-payment-modal"
        destroyOnHidden
      >
        <Form
          form={paymentForm}
          layout="vertical"
          requiredMark={false}
          onFinish={acceptPayment}
        >
          <Form.Item
            name="installment"
            label="Qaysi oy uchun"
            rules={[{ required: true, message: "Davrni tanlang" }]}
          >
            <Select
              onChange={() => paymentForm.setFieldValue("amount", null)}
              options={(paymentDebtor?.periods || []).map((paymentPeriod) => ({
                value: paymentPeriod.id,
                label: `${paymentPeriod.periodKey} — ${money(paymentPeriod.debt)} qoldiq`,
              }))}
            />
          </Form.Item>
          {selectedPeriod && (
            <div className="debtor-payment-balance">
              <span>Tanlangan davr qarzdorligi</span>
              <strong>{money(selectedPeriod.debt)}</strong>
            </div>
          )}
          <Form.Item
            name="amount"
            label="To‘lov summasi"
            rules={[{ required: true, message: "Summani kiriting" }]}
          >
            <InputNumber
              min={1}
              max={selectedPeriod?.debt}
              precision={0}
              addonAfter="so‘m"
              formatter={(value) =>
                String(value || "").replace(/\B(?=(\d{3})+(?!\d))/g, " ")
              }
              parser={(value) => String(value || "").replace(/[^\d]/g, "")}
            />
          </Form.Item>
          <Form.Item name="method" hidden rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <div className="debtor-method-field">
            <label>To‘lov turi</label>
            <div>
              {Object.entries(methods).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={paymentMethod === value ? "active" : ""}
                  onClick={() => paymentForm.setFieldValue("method", value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Form.Item name="note" label="Izoh">
            <Input placeholder="Ixtiyoriy" />
          </Form.Item>
          <div className="debtor-payment-actions">
            <Button onClick={() => setPaymentDebtor(null)}>Bekor qilish</Button>
            <Button type="primary" htmlType="submit" loading={creatingPayment}>
              To‘lovni tasdiqlash
            </Button>
          </div>
        </Form>
      </Modal>
      <Modal
        open={Boolean(historyDebtor)}
        onCancel={() => setHistoryDebtor(null)}
        footer={null}
        width={760}
        title={
          historyDebtor
            ? `${historyDebtor.student.fullName} — to‘lovlar tarixi`
            : "To‘lovlar tarixi"
        }
        rootClassName="debtor-history-modal"
      >
        <div className="debtor-history-wrap">
          <table className="debtor-history-table">
            <thead>
              <tr>
                <th>Sana</th>
                <th>Shartnoma</th>
                <th>Qaysi oy uchun</th>
                <th>To‘lov turi</th>
                <th>Summa</th>
                <th>Izoh</th>
              </tr>
            </thead>
            <tbody>
              {(historyDebtor?.paymentHistory || []).map((payment) => (
                <tr key={payment.id}>
                  <td>{dayjs(payment.createdAt).format("DD.MM.YYYY HH:mm")}</td>
                  <td>{payment.contract?.contractNumber || "—"}</td>
                  <td>
                    <span>
                      {payment.allocations?.[0]?.installment?.periodKey || "—"}
                    </span>
                  </td>
                  <td>{methods[payment.method] || payment.method}</td>
                  <td>
                    <strong>{money(payment.amount)}</strong>
                  </td>
                  <td>{payment.note || "—"}</td>
                </tr>
              ))}
              {!historyDebtor?.paymentHistory?.length && (
                <tr>
                  <td colSpan="6" className="debtor-state">
                    To‘lovlar tarixi mavjud emas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
