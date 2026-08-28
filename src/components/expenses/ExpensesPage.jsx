import { useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Popconfirm,
  Segmented,
  Select,
} from "antd";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import {
  apiErrorMessage,
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
  useGetExpensesQuery,
  useUpdateExpenseMutation,
} from "../../store/baseApi";
import "./Expenses.css";
import "./ExpensesToolbar.css";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { canEditOrDelete } from "../../utils/permissions";

const paymentTypes = [
  { value: "cash", label: "Naqd" },
  { value: "card", label: "Karta" },
  { value: "click", label: "Click" },
  { value: "bank", label: "Bank" },
];
const paymentLabels = Object.fromEntries(
  paymentTypes.map((item) => [item.value, item.label]),
);
const defaultCategories = [
  "Oziq-ovqat",
  "Kommunal",
  "Ta’mirlash",
  "Jihozlar",
  "Transport",
  "Ish haqi",
  "Tozalik",
  "Inobatga olinmagan",
  "Doimiy harajatlar",
  "Boshqa",
];
const money = (value) => `${Number(value || 0).toLocaleString("uz-UZ")} so‘m`;
const employeeName = (employee) =>
  `${employee?.firstname || ""} ${employee?.lastname || ""}`.trim() ||
  "Noma’lum xodim";

export function ExpensesPage({ currentEmployee }) {
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [range, setRange] = useState(() => [
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const params = {
    page,
    ...(search ? { search } : {}),
    ...(category ? { category } : {}),
    ...(paymentType ? { paymentType } : {}),
    ...(range?.[0] ? { startDate: range[0].format("YYYY-MM-DD") } : {}),
    ...(range?.[1] ? { endDate: range[1].format("YYYY-MM-DD") } : {}),
  };
  const { data, isLoading, isFetching, error } = useGetExpensesQuery(params);
  const [createExpense, { isLoading: creating }] = useCreateExpenseMutation();
  const [updateExpense, { isLoading: updating }] = useUpdateExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();
  const canManage = canEditOrDelete(currentEmployee);
  const categories = useMemo(
    () =>
      [...new Set([...defaultCategories, ...(data?.categories || [])])].sort(),
    [data?.categories],
  );

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      category: "Oziq-ovqat",
      paymentType: "cash",
      spentAt: dayjs(),
      note: "",
    });
    setModalOpen(true);
  };
  const openEdit = (expense) => {
    setEditing(expense);
    form.setFieldsValue({
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      paymentType: expense.paymentType,
      spentAt: dayjs(expense.createdAt),
      note: expense.note || "",
    });
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  };
  const submit = async (values) => {
    const selectedCategory = Array.isArray(values.category)
      ? values.category[0]
      : values.category;
    const body = {
      title: values.title.trim(),
      category: selectedCategory,
      amount: Number(values.amount),
      paymentType: values.paymentType,
      note: values.note?.trim() || "",
    };
    try {
      if (editing) await updateExpense({ id: editing.id, ...body }).unwrap();
      else await createExpense(body).unwrap();
      toast.success(editing ? "Xarajat yangilandi" : "Xarajat qo‘shildi");
      closeModal();
    } catch (requestError) {
      toast.error(apiErrorMessage(requestError));
    }
  };
  const remove = async (id) => {
    try {
      await deleteExpense(id).unwrap();
      toast.success("Xarajat o‘chirildi");
    } catch (requestError) {
      toast.error(apiErrorMessage(requestError));
    }
  };

  const summary = data?.summary || {};
  return (
    <div className="expenses-page">
      <section className="expense-stats">
        <article className="total">
          <small>Jami xarajat</small>
          <strong>{money(summary.totalAmount)}</strong>
          <span>{summary.count || 0} ta yozuv</span>
        </article>
        {paymentTypes.map((item) => (
          <article key={item.value} className={item.value}>
            <small>{item.label}</small>
            <strong>{money(summary.byPaymentType?.[item.value])}</strong>
            <span>to‘lov turi bo‘yicha</span>
          </article>
        ))}
      </section>
      <section className="expenses-card">
        <div className="expenses-tools">
          <div>
            <h3>Xarajatlar ro‘yxati</h3>
            <p>Ko‘rsatilayotgan davr bo‘yicha barcha chiqimlar</p>
          </div>
          <div className="expense-filters">
            <div className="expense-search">
              <span>⌕</span>
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Nomi, kategoriya yoki izoh"
              />
            </div>
            <button className="expense-filter-toggle" type="button" aria-label="Filterlar" onClick={() => setFiltersOpen(true)}>☷</button>
            <Select
              allowClear
              value={category || undefined}
              placeholder="Kategoriya"
              options={(data?.categories || []).map((value) => ({
                value,
                label: value,
              }))}
              onChange={(value = "") => {
                setCategory(value);
                setPage(1);
              }}
            />
            <Select
              allowClear
              value={paymentType || undefined}
              placeholder="To‘lov turi"
              options={paymentTypes}
              onChange={(value = "") => {
                setPaymentType(value);
                setPage(1);
              }}
            />
            <div className="expense-date-range">
              <DatePicker placeholder="Boshlanish" value={range?.[0] || null} maxDate={range?.[1]} format="DD.MM.YYYY" onChange={(value) => { setRange([value, range?.[1] || null]); setPage(1); }} />
              <DatePicker placeholder="Tugash" value={range?.[1] || null} minDate={range?.[0]} format="DD.MM.YYYY" onChange={(value) => { setRange([range?.[0] || null, value]); setPage(1); }} />
            </div>
            <button className="expense-add-button" onClick={openCreate}>
              + Xarajat qo‘shish
            </button>
          </div>
        </div>
        {error && <div className="form-error">{apiErrorMessage(error)}</div>}
        {isLoading ? (
          <div className="expense-state">Xarajatlar yuklanmoqda…</div>
        ) : (
          <div
            className={`expense-table-wrap ${isFetching ? "refreshing" : ""}`}
          >
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Xarajat</th>
                  <th>Kategoriya</th>
                  <th>To‘lov turi</th>
                  <th>Summa</th>
                  <th>Sana</th>
                  <th>Kiritgan xodim</th>
                  <th>Izoh</th>
                  {canManage && <th>Amal</th>}
                </tr>
              </thead>
              <tbody>
                {(data?.expenses || []).map((expense) => (
                  <tr key={expense.id}>
                    <td data-label="Xarajat">
                      <strong>{expense.title}</strong>
                      <small>#{expense.id.slice(-6).toUpperCase()}</small>
                    </td>
                    <td data-label="Kategoriya">
                      <span className="expense-category">
                        {expense.category}
                      </span>
                    </td>
                    <td data-label="To‘lov">
                      <span className={`expense-method ${expense.paymentType}`}>
                        {paymentLabels[expense.paymentType]}
                      </span>
                    </td>
                    <td data-label="Summa">
                      <b className="expense-money">{money(expense.amount)}</b>
                    </td>
                    <td data-label="Sana">
                      <strong>
                        {dayjs(expense.spentAt).format("DD.MM.YYYY")}
                      </strong>
                      <small>
                        {dayjs(expense.createdAt).format("HH:mm")} da kiritilgan
                      </small>
                    </td>
                    <td data-label="Xodim">
                      <strong>{employeeName(expense.createdBy)}</strong>
                      <small>{expense.createdBy?.position || "—"}</small>
                    </td>
                    <td data-label="Izoh">
                      <span className="expense-note" title={expense.note}>
                        {expense.note || "—"}
                      </span>
                    </td>
                    {canManage && (
                      <td data-label="Amal">
                        <div className="expense-actions">
                          <Button className="edit" aria-label="Tahrirlash" icon={<EditOutlined />} onClick={() => openEdit(expense)} />
                          <Popconfirm
                            title="Xarajat o‘chirilsinmi?"
                            description="Bu amalni ortga qaytarib bo‘lmaydi."
                            okText="O‘chirish"
                            cancelText="Bekor qilish"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => remove(expense.id)}
                          >
                            <Button className="delete" aria-label="O‘chirish" icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {!data?.expenses?.length && (
                  <tr>
                    <td colSpan={canManage ? 8 : 7} className="expense-state">
                      Tanlangan filtr bo‘yicha xarajat topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {(data?.pagination?.total || 0) > 25 && (
          <div className="expense-pagination">
            <span>Jami {data.pagination.total} ta xarajat</span>
            <Pagination
              current={data.pagination.page}
              pageSize={25}
              total={data.pagination.total}
              showSizeChanger={false}
              onChange={setPage}
            />
          </div>
        )}
      </section>
      <Modal open={filtersOpen} onCancel={() => setFiltersOpen(false)} footer={null} title="Filterlar" rootClassName="expense-filters-modal"><div className="expense-filter-modal-options"><Select allowClear value={category || undefined} placeholder="Kategoriya" options={(data?.categories || []).map((value) => ({ value, label: value }))} onChange={(value = '') => { setCategory(value); setPage(1) }} /><Select allowClear value={paymentType || undefined} placeholder="To‘lov turi" options={paymentTypes} onChange={(value = '') => { setPaymentType(value); setPage(1) }} /><div className="expense-date-range"><DatePicker placeholder="Boshlanish" value={range?.[0] || null} maxDate={range?.[1]} format="DD.MM.YYYY" onChange={(value) => { setRange([value, range?.[1] || null]); setPage(1) }} /><DatePicker placeholder="Tugash" value={range?.[1] || null} minDate={range?.[0]} format="DD.MM.YYYY" onChange={(value) => { setRange([range?.[0] || null, value]); setPage(1) }} /></div></div></Modal>
      <Modal
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        width={600}
        title={editing ? "Xarajatni tahrirlash" : "Yangi xarajat qo‘shish"}
        destroyOnHidden
        rootClassName="expense-modal"
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={submit}
        >
          <div className="expense-form-grid">
            <Form.Item
              name="title"
              label="Xarajat nomi"
              rules={[{ required: true, message: "Xarajat nomini kiriting" }]}
            >
              <Input maxLength={150} placeholder="Masalan: Elektr energiyasi" />
            </Form.Item>
            <Form.Item
              name="category"
              label="Kategoriya"
              rules={[{ required: true, message: "Kategoriyani tanlang" }]}
            >
              <Select
                showSearch
                options={categories.map((value) => ({ value, label: value }))}
                placeholder="Kategoriya"
              />
            </Form.Item>
            <Form.Item
              name="amount"
              label="Summa"
              rules={[{ required: true, message: "Summani kiriting" }]}
            >
              <InputNumber
                min={1}
                precision={0}
                addonAfter="so‘m"
                formatter={(value) =>
                  String(value || "").replace(/\B(?=(\d{3})+(?!\d))/g, " ")
                }
                parser={(value) => String(value || "").replace(/[^\d]/g, "")}
              />
            </Form.Item>
            <Form.Item
              name="spentAt"
              label="Xarajat sanasi"
              rules={[{ required: true, message: "Sanani tanlang" }]}
            >
              <DatePicker
                allowClear={false}
                format="DD.MM.YYYY"
                disabledDate={(current) =>
                  current && current.isAfter(dayjs(), "day")
                }
              />
            </Form.Item>
          </div>
          <Form.Item
            name="paymentType"
            label="To‘lov turi"
            rules={[{ required: true }]}
          >
            <Segmented block options={paymentTypes} />
          </Form.Item>
          <Form.Item name="note" label="Izoh">
            <Input.TextArea
              rows={3}
              maxLength={1000}
              showCount
              placeholder="Qo‘shimcha ma’lumot"
            />
          </Form.Item>
          <div className="expense-modal-actions">
            <Button onClick={closeModal}>Bekor qilish</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={creating || updating}
            >
              {editing ? "O‘zgarishlarni saqlash" : "Xarajatni saqlash"}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
