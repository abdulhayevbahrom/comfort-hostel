import { useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
} from "antd";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import {
  apiErrorMessage,
  useCreatePaymentMutation,
  useDeletePaymentMutation,
  useGetGeneralSettingsQuery,
  useGetPaymentOptionsQuery,
  useGetPaymentsQuery,
  useUpdatePaymentMutation,
} from "../../store/baseApi";
import { PaymentPrintIcon } from "./PaymentReceiptModal";
import { printPaymentReceipt } from "./paymentReceipt";
import { AdvancePaymentsTab } from "./AdvancePaymentsTab";
import "./Payments.css";
import { canEditOrDelete } from "../../utils/permissions";

const methods = { cash: "Naqd", online: "Click", bank: "Bank", card: "Karta" };
const money = (value) => `${Number(value || 0).toLocaleString("uz-UZ")} so‘m`;
const statMoney = (value) => money(value).replace(/\sso‘m$/, "");

export function PaymentsPage({ currentEmployee }) {
  const [activeTab, setActiveTab] = useState("current");
  const [form] = Form.useForm();
  const [filters, setFilters] = useState({
    search: "",
    method: "",
    from: "",
    to: "",
  });
  const [draftSearch, setDraftSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [historyPayment, setHistoryPayment] = useState(null);
  const { data, isLoading, error } = useGetPaymentsQuery(filters);
  const { data: optionsData, isLoading: optionsLoading } =
    useGetPaymentOptionsQuery(undefined, { skip: !open });
  const { data: settingsData } = useGetGeneralSettingsQuery();
  const [createPayment, { isLoading: saving }] = useCreatePaymentMutation();
  const [updatePayment, { isLoading: updating }] = useUpdatePaymentMutation();
  const [deletePayment, { isLoading: deleting }] = useDeletePaymentMutation();
  const selectedContractId = Form.useWatch("contract", form);
  const selectedMethod = Form.useWatch("method", form);
  const selectedFundHolder = Form.useWatch("fundHolder", form);
  const selectedInstallmentId = Form.useWatch("installment", form);
  const contracts = optionsData?.contracts || [];
  const selectableContracts = editingPayment
    ? contracts
    : contracts.filter((item) => item.balance > 0);
  const selected = contracts.find((item) => item._id === selectedContractId);
  const installments = editingPayment
    ? selected?.installments || []
    : (selected?.installments || [])
        .filter((item) => item.paidAmount < item.amount);
  const selectedInstallment = installments.find(
    (item) => item._id === selectedInstallmentId,
  );
  const rows = useMemo(() => data?.payments || [], [data?.payments]);
  const summary = data?.summary || {};
  const isOwner = canEditOrDelete(currentEmployee);
  const availableBalance = selectedInstallment
    ? Math.max(0, selectedInstallment.amount - selectedInstallment.paidAmount) +
      (editingPayment?.amount || 0)
    : 0;

  const openForm = () => {
    setEditingPayment(null);
    form.setFieldsValue({
      method: "cash",
      amount: null,
      contract: undefined,
      installment: undefined,
      note: "",
      payerType: "",
      fundHolder: "cashier",
    });
    setOpen(true);
  };
  const openEdit = (payment) => {
    setEditingPayment(payment);
    form.setFieldsValue({
      contract: payment.contract?.id,
      installment: payment.allocations?.[0]?.installment?.id,
      amount: payment.amount,
      method: payment.method,
      payerType: payment.payerType || "",
      note: payment.note || "",
    });
    setOpen(true);
  };
  const submit = async (values) => {
    try {
      if (editingPayment) {
        await updatePayment({
          id: editingPayment.id,
          amount: Number(values.amount),
          method: values.method,
          payerType: values.payerType,
          note: values.note,
        }).unwrap();
        toast.success("To‘lov yangilandi");
      } else {
        const result = await createPayment({
          ...values,
          amount: Number(values.amount),
        }).unwrap();
        printPaymentReceipt(result.payment, settingsData?.settings);
        toast.success("To‘lov muvaffaqiyatli qabul qilindi");
      }
      setOpen(false);
      setEditingPayment(null);
      form.resetFields();
    } catch (requestError) {
      toast.error(apiErrorMessage(requestError));
    }
  };
  const remove = async (id) => {
    try {
      await deletePayment(id).unwrap();
      toast.success("To‘lov bekor qilindi");
    } catch (requestError) {
      toast.error(apiErrorMessage(requestError));
    }
  };
  const employeeName = (employee) => employee
    ? `${employee.firstname || ""} ${employee.lastname || ""}`.trim()
    : "Noma’lum xodim";
  const lastEditor = (payment) => [...(payment.auditHistory || [])]
    .reverse()
    .find((entry) => entry.action === "updated")?.performedBy;
  const actionNames = { created: "To‘lov qabul qilindi", updated: "To‘lov tahrirlandi", cancelled: "To‘lov bekor qilindi" };

  return (
    <div className="payments-page">
      <section className="payment-hero">
        <div>
          <span className="payment-eyebrow">MOLIYAVIY BOSHQARUV</span>
          <h2>To‘lovlar</h2>
          <p>
            Talabalar to‘lovlarini qabul qiling va barcha tushumlarni kuzating.
          </p>
        </div>
        <button className="payment-add" onClick={openForm}>
          <span>+</span> To‘lov qabul qilish
        </button>
      </section>

      <nav className="payment-tabs" aria-label="To‘lov bo‘limlari">
        <button className={activeTab === "current" ? "active" : ""} onClick={() => setActiveTab("current")}>Joriy to‘lovlar</button>
        <button className={activeTab === "advance" ? "active" : ""} onClick={() => setActiveTab("advance")}>Oldindan to‘lovlar</button>
      </nav>

      {activeTab === "current" ? <>
      <section className="payment-stats">
        {[
          ["total", "Hisoblangan", statMoney(summary.billed)],
          ["month", "To‘langan", statMoney(summary.paid)],
          [
            "debt",
            summary.isFuturePeriod ? "Qarzdorlik boshlanmagan" : "Qarzdorlik",
            statMoney(summary.debt),
          ],
          ["today", "To‘lov qilgan", `${summary.paidStudents || 0} talaba`],
          [
            "unpaid",
            summary.isFuturePeriod ? "To‘lov kutilmoqda" : "To‘lov qilmagan",
            `${summary.isFuturePeriod ? summary.waitingStudents || 0 : summary.unpaidStudents || 0} talaba`,
          ],
        ].map(([type, label, value]) => (
          <article className={`payment-stat ${type}`} key={type}>
            <small>{label}</small>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="payment-card">
        <div className="payment-card-head">
          <div>
            <h3>To‘lovlar tarixi</h3>
            <p>{summary.count || 0} ta tranzaksiya</p>
          </div>
        </div>
        <div className="payment-filters">
          <div className="payment-search">
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m16.5 16.5 4 4" />
              </svg>
            </span>
            <input
              value={draftSearch}
              placeholder="Talaba, telefon yoki shartnoma raqami"
              onChange={(e) => {
                const value = e.target.value
                setDraftSearch(value)
                setFilters((old) => ({ ...old, search: value }))
              }}
            />
            <button className="payment-filter-toggle" type="button" aria-label="Filterlarni ochish" onClick={() => setFiltersOpen(true)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M7 12h10M10 17h4" /></svg>
            </button>
          </div>
          <div className="payment-filter-options">
          <Select
            allowClear
            placeholder="Barcha usullar"
            value={filters.method || undefined}
            onChange={(value) =>
              setFilters((old) => ({ ...old, method: value || "" }))
            }
            options={Object.entries(methods).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <div className="payment-date-range">
            <DatePicker placeholder="Boshlanish" value={filters.from ? dayjs(filters.from) : null} maxDate={filters.to ? dayjs(filters.to) : undefined} format="DD.MM.YYYY" onChange={(date) => setFilters((old) => ({ ...old, from: date?.format("YYYY-MM-DD") || "" }))} />
            <DatePicker placeholder="Tugash" value={filters.to ? dayjs(filters.to) : null} minDate={filters.from ? dayjs(filters.from) : undefined} format="DD.MM.YYYY" onChange={(date) => setFilters((old) => ({ ...old, to: date?.format("YYYY-MM-DD") || "" }))} />
          </div>
          </div>
        </div>
        {error && <div className="form-error">{apiErrorMessage(error)}</div>}
        {isLoading ? (
          <div className="payment-loader">
            <span /> To‘lovlar yuklanmoqda...
          </div>
        ) : (
          <div className="payment-table-wrap">
            <table className="payment-table">
              <thead>
                <tr>
                  <th>Talaba</th>
                  <th>Shartnoma</th>
                  <th>Qaysi oy uchun</th>
                  <th>Sana</th>
                  <th>To‘lov usuli</th>
                  <th>To‘lovchi</th>
                  <th>Qabul qilgan</th>
                  <th>Tahrirlagan</th>
                  <th>Summa</th>
                  <th>Izoh</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((payment) => (
                  <tr key={payment.id} className={payment.status === "cancelled" ? "payment-cancelled-row" : ""}>
                    <td data-label="Talaba">
                      <strong>{payment.student?.fullName}</strong>
                      <small>{payment.student?.phone}</small>
                    </td>
                    <td data-label="Shartnoma">
                      <span className="contract-pill">
                        {payment.contract?.contractNumber}
                      </span>
                      <small>
                        {payment.contract?.room
                          ? `${payment.contract.room.block || ""} ${payment.contract.room.roomNumber || ""}-xona`
                          : ""}
                      </small>
                    </td>
                    <td data-label="Oy">
                      <span className="payment-period">
                        {payment.allocations?.[0]?.installment?.periodKey ||
                          "—"}
                      </span>
                    </td>
                    <td data-label="Sana">
                      {dayjs(payment.createdAt).format("DD.MM.YYYY")}
                      <small>{dayjs(payment.createdAt).format("HH:mm")}</small>
                    </td>
                    <td data-label="Usul">
                      <span className={`method-badge ${payment.method}`}>
                        {methods[payment.method]}
                      </span>
                      {payment.method !== "cash" && payment.fundHolder && <small>{payment.fundHolder === "organization" ? "Tashkilot hisobi" : "Kassirning shaxsiy hisobi"}</small>}
                    </td>
                    <td data-label="To‘lovchi">
                      <strong>{payment.payerType || "—"}</strong>
                    </td>
                    <td data-label="Qabul qilgan">
                      <strong>{employeeName(payment.receivedBy)}</strong>
                    </td>
                    <td data-label="Tahrirlagan">
                      {lastEditor(payment) ? <strong>{employeeName(lastEditor(payment))}</strong> : "—"}
                    </td>
                    <td data-label="Summa">
                      <b className="payment-amount">
                        {payment.status === "cancelled" ? "" : "+ "}{money(payment.amount)}
                      </b>
                      {payment.status === "cancelled" && <small className="payment-cancelled-badge">Bekor qilingan</small>}
                    </td>
                    <td data-label="Izoh">{payment.note || "—"}</td>
                    <td>
                      <div className="payment-row-actions">
                        <button
                          className="payment-receipt-btn"
                          title="Chek"
                          aria-label="To‘lov chekini chiqarish"
                          onClick={() =>
                            printPaymentReceipt(payment, settingsData?.settings)
                          }
                        >
                          <PaymentPrintIcon />
                        </button>
                        <button className="payment-history" title="Amallar tarixi" aria-label="To‘lov amallari tarixini ko‘rish" onClick={() => setHistoryPayment(payment)}>
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5l3 2M4.5 9A8 8 0 1 1 4 12M4 5v4h4" /></svg>
                        </button>
                        {isOwner && payment.status !== "cancelled" && (
                          <>
                            <button
                              className="payment-edit"
                              title="Tahrirlash"
                              aria-label="To‘lovni tahrirlash"
                              onClick={() => openEdit(payment)}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M4 20h4l11-11-4-4L4 16v4Z" />
                                <path d="m13.5 6.5 4 4M4 20h16" />
                              </svg>
                            </button>
                            <Popconfirm
                              title="To‘lovni bekor qilish"
                              description="Summa qarzdorlikka qaytariladi. Davom etasizmi?"
                              okText="Bekor qilish"
                              cancelText="Yo‘q"
                              okButtonProps={{
                                danger: true,
                                loading: deleting,
                              }}
                              onConfirm={() => remove(payment.id)}
                            >
                              <button
                                className="payment-delete"
                                title="O‘chirish"
                              >
                                ×
                              </button>
                            </Popconfirm>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td className="payment-empty" colSpan="11">
                      <span>₸</span>
                      <strong>To‘lov topilmadi</strong>
                      <p>Tanlangan filtrlar bo‘yicha to‘lov mavjud emas.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      </> : <AdvancePaymentsTab />}

      <Modal open={filtersOpen} onCancel={() => setFiltersOpen(false)} footer={null} title="Filterlar" rootClassName="payment-filters-modal" destroyOnHidden>
        <div className="payment-filter-modal-options">
          <Select allowClear placeholder="Barcha usullar" value={filters.method || undefined} onChange={(value) => setFilters((old) => ({ ...old, method: value || "" }))} options={Object.entries(methods).map(([value, label]) => ({ value, label }))} />
          <div className="payment-date-range"><DatePicker placeholder="Boshlanish" value={filters.from ? dayjs(filters.from) : null} maxDate={filters.to ? dayjs(filters.to) : undefined} format="DD.MM.YYYY" onChange={(date) => setFilters((old) => ({ ...old, from: date?.format("YYYY-MM-DD") || "" }))} /><DatePicker placeholder="Tugash" value={filters.to ? dayjs(filters.to) : null} minDate={filters.from ? dayjs(filters.from) : undefined} format="DD.MM.YYYY" onChange={(date) => setFilters((old) => ({ ...old, to: date?.format("YYYY-MM-DD") || "" }))} /></div>
        </div>
      </Modal>

      <Modal open={Boolean(historyPayment)} onCancel={() => setHistoryPayment(null)} footer={null} title="To‘lov amallari tarixi" width={560}>
        <div className="payment-audit-list">
          {(historyPayment?.auditHistory?.length
            ? [...historyPayment.auditHistory].reverse()
            : [{ action: "created", performedBy: historyPayment?.receivedBy, performedAt: historyPayment?.createdAt, after: historyPayment }]
          ).map((entry, index) => (
            <article key={entry._id || `${entry.action}-${index}`}>
              <span className={`payment-audit-dot ${entry.action}`} />
              <div>
                <strong>{actionNames[entry.action] || entry.action}</strong>
                <p>{employeeName(entry.performedBy)}</p>
                {entry.action === "updated" && <small>{money(entry.before?.amount)} → {money(entry.after?.amount)} · {methods[entry.before?.method]} → {methods[entry.after?.method]}</small>}
                {entry.action === "cancelled" && <small>Bekor qilingan summa: {money(entry.before?.amount)}</small>}
                <time>{dayjs(entry.performedAt || historyPayment?.createdAt).format("DD.MM.YYYY HH:mm")}</time>
              </div>
            </article>
          ))}
        </div>
      </Modal>

      <Modal
        open={open}
        onCancel={() => {
          setOpen(false);
          setEditingPayment(null);
        }}
        footer={null}
        title={
          editingPayment ? "To‘lovni tahrirlash" : "Yangi to‘lov qabul qilish"
        }
        width={660}
        rootClassName="payment-modal"
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={submit}
        >
          <Form.Item
            name="contract"
            label="Talaba va shartnoma"
            rules={[
              { required: true, message: "Talaba shartnomasini tanlang" },
            ]}
          >
            <Select
              disabled={Boolean(editingPayment)}
              showSearch
              loading={optionsLoading}
              optionFilterProp="label"
              placeholder="Talabani qidiring"
              onChange={() =>
                form.setFieldsValue({ installment: undefined, amount: null })
              }
              options={selectableContracts.map((item) => ({
                value: item._id,
                label: `${item.student?.fullName} — ${item.contractNumber} (${money(item.balance)} qoldiq)`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="installment"
            label="Qaysi oy uchun"
            rules={[{ required: true, message: "To‘lov oyini tanlang" }]}
          >
            <Select
              disabled={!selected || Boolean(editingPayment)}
              placeholder="Oy yoki davrni tanlang"
              options={installments.map((item) => ({
                value: item._id,
                label: `${item.periodKey} — ${money(Math.max(0, item.amount - item.paidAmount))} qoldiq`,
              }))}
            />
          </Form.Item>
          {selected && (
            <div className="selected-contract">
              <div>
                <small>Talaba</small>
                <b>{selected.student?.fullName}</b>
              </div>
              <div>
                <small>Xona</small>
                <b>{selected.room?.roomNumber || "—"}</b>
              </div>
              <div>
                <small>Tanlangan oy qoldig‘i</small>
                <b>{money(availableBalance)}</b>
              </div>
            </div>
          )}
          <Form.Item
            name="amount"
            label="To‘lov summasi"
            rules={[{ required: true, message: "Summani kiriting" }]}
          >
            <InputNumber
              min={1}
              max={availableBalance || undefined}
              precision={0}
              placeholder="0"
              addonAfter="so‘m"
              formatter={(v) =>
                String(v || "").replace(/\B(?=(\d{3})+(?!\d))/g, " ")
              }
              parser={(v) => String(v || "").replace(/[^\d]/g, "")}
            />
          </Form.Item>
          <Form.Item name="payerType" label="To‘lovni kim qildi?" rules={[{ required: true, whitespace: true, message: "To‘lovchini kiriting" }]}>
            <Input maxLength={150} placeholder="Masalan: otasi yoki talabaning o‘zi" />
          </Form.Item>
          <Form.Item
            name="method"
            hidden
            rules={[{ required: true, message: "To‘lov usulini tanlang" }]}
          >
            <Input />
          </Form.Item>
          <div className="method-field">
            <label>To‘lov turi</label>
            <div className="method-options">
              {Object.entries(methods).map(([value, label]) => (
                <button
                  type="button"
                  className={selectedMethod === value ? "active" : ""}
                  key={value}
                  onClick={() => form.setFieldValue("method", value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {!editingPayment && currentEmployee?.role === "cashier" && !["cash", "bank"].includes(selectedMethod) && (
            <div className="fund-holder-field">
              <label>Pul qaysi hisobga tushdi?</label>
              <Form.Item name="fundHolder" hidden rules={[{ required: true, message: "Hisobni tanlang" }]}><Input /></Form.Item>
              <div className="fund-holder-options">
                <button type="button" className={selectedFundHolder === "cashier" ? "active" : ""} onClick={() => form.setFieldValue("fundHolder", "cashier")}>O‘zimga</button>
                <button type="button" className={selectedFundHolder === "organization" ? "active" : ""} onClick={() => form.setFieldValue("fundHolder", "organization")}>Tashkilotga</button>
              </div>
            </div>
          )}
          <Form.Item name="note" label="Izoh">
            <Input placeholder="Ixtiyoriy" />
          </Form.Item>
          <div className="payment-modal-actions">
            <Button onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving || updating}
            >
              {editingPayment ? "Saqlash" : "To‘lovni tasdiqlash"}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
