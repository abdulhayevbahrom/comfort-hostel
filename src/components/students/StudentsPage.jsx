import { useDeferredValue, useMemo, useState } from "react";
import { Modal, Pagination, Popconfirm, Select } from "antd";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import {
  apiErrorMessage,
  useCreateStudentMutation,
  useDeleteStudentMutation,
  useGetFacultiesQuery,
  useGetRoomsQuery,
  useGetStudentsQuery,
  useGetUniversitiesQuery,
  useUpdateStudentMutation,
} from "../../store/baseApi";
import { StudentFormModal } from "./StudentFormModal";
import { StudentHistoryTab } from "./StudentHistoryTab";
import "./Students.css";
import "./StudentHistory.css";
import "./StudentsTabsCompact.css";
import { canEditOrDelete } from "../../utils/permissions";

const studentStatusLabel = {
  green: "Qoladi",
  warning: "50/50",
  red: "Ketadi",
};

const isContractExpiringWithinTwoDays = (endDate) => {
  if (!endDate) return false;
  const daysLeft = dayjs(endDate).startOf("day").diff(dayjs().startOf("day"), "day");
  return daysLeft >= 0 && daysLeft <= 2;
};

function StudentsListTab({ currentEmployee }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [universityFilter, setUniversityFilter] = useState(undefined);
  const [facultyFilter, setFacultyFilter] = useState(undefined);
  const [courseFilter, setCourseFilter] = useState(undefined);
  const [roomFilter, setRoomFilter] = useState(undefined);
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const deferredQuery = useDeferredValue(query.trim());
  const {
    data,
    isLoading,
    isFetching,
    error: listError,
  } = useGetStudentsQuery({
    search: deferredQuery,
    page,
    university: universityFilter,
    faculty: facultyFilter,
    course: courseFilter,
    room: roomFilter,
    studentStatus: statusFilter,
  });
  const { data: universityData } = useGetUniversitiesQuery();
  const { data: facultyData } = useGetFacultiesQuery();
  const { data: roomData } = useGetRoomsQuery();
  const [createStudent, { isLoading: creating }] = useCreateStudentMutation();
  const [updateStudent, { isLoading: updating }] = useUpdateStudentMutation();
  const [deleteStudent, { isLoading: deleting }] = useDeleteStudentMutation();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const canManage = canEditOrDelete(currentEmployee);
  const students = useMemo(() => data?.students || [], [data?.students]);
  const pagination = data?.pagination || { page: 1, total: 0, limit: 25 };
  const universities = useMemo(
    () => universityData?.universities || [],
    [universityData?.universities],
  );
  const faculties = useMemo(
    () =>
      (facultyData?.faculties || []).filter(
        (item) =>
          !universityFilter ||
          (item.university?.id || item.university) === universityFilter,
      ),
    [facultyData?.faculties, universityFilter],
  );
  const rooms = useMemo(() => roomData?.rooms || [], [roomData?.rooms]);
  const close = () => {
    setModalOpen(false);
    setEditing(null);
    setError("");
  };
  const submit = async ({ values, photoFiles, marriageCertificateFiles, removePhoto }) => {
    try {
      setError("");
      const body = new FormData();
      body.append("payload", JSON.stringify({ ...values, removePhoto }));
      if (photoFiles[0]?.originFileObj)
        body.append("photo", photoFiles[0].originFileObj);
      if (marriageCertificateFiles[0]?.originFileObj)
        body.append("marriageCertificate", marriageCertificateFiles[0].originFileObj);
      if (editing) await updateStudent({ id: editing.id, body }).unwrap();
      else await createStudent(body).unwrap();
      toast.success(editing ? "Talaba yangilandi" : "Talaba qo‘shildi");
      close();
    } catch (requestError) {
      const message = apiErrorMessage(requestError);
      setError(message);
      toast.error(message);
    }
  };
  const remove = async (id) => {
    try {
      await deleteStudent(id).unwrap();
      toast.success("Talaba o‘chirildi");
    } catch (requestError) {
      toast.error(apiErrorMessage(requestError));
    }
  };

  return (
    <div className="students-page">
      <div className="students-card">
        <div className="students-toolbar">
          <div className="students-toolbar-controls">
            <div className="students-toolbar-actions">
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="F.I.O, telefon, JSHR yoki pasport"
              />
              <button
                type="button"
                className="students-filter-toggle"
                aria-label="Filterlarni ochish"
                onClick={() => setFiltersModalOpen(true)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16M7 12h10M10 17h4" />
                </svg>
              </button>
            </div>
            <div className="students-toolbar-filters">
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="F.I.O, telefon, JSHR yoki pasport"
              />
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Universitet"
                value={universityFilter}
                options={universities.map((item) => ({
                  value: item.id,
                  label: item.shortName || item.name,
                }))}
                onChange={(value) => {
                  setUniversityFilter(value);
                  setFacultyFilter(undefined);
                  setPage(1);
                }}
              />
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Fakultet"
                value={facultyFilter}
                options={faculties.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
                onChange={(value) => {
                  setFacultyFilter(value);
                  setPage(1);
                }}
              />
              <Select
                allowClear
                placeholder="Kurs"
                value={courseFilter}
                options={[1, 2, 3, 4, 5, 6].map((value) => ({
                  value,
                  label: `${value}-kurs`,
                }))}
                onChange={(value) => {
                  setCourseFilter(value);
                  setPage(1);
                }}
              />
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Xona"
                value={roomFilter}
                options={rooms.map((room) => ({
                  value: room.id,
                  label: `${room.block} blok · ${room.roomNumber}-xona`,
                }))}
                onChange={(value) => {
                  setRoomFilter(value);
                  setPage(1);
                }}
              />
              <Select
                allowClear
                placeholder="Talaba holati"
                value={statusFilter}
                options={Object.entries(studentStatusLabel).map(([value, label]) => ({
                  value,
                  label,
                }))}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              />
              <button onClick={() => setModalOpen(true)}>+ Yangi talaba</button>
            </div>
            <button
              type="button"
              className="students-mobile-create"
              onClick={() => setModalOpen(true)}
            >
              + Yangi talaba
            </button>
          </div>
        </div>
        {listError && (
          <div className="form-error">{apiErrorMessage(listError)}</div>
        )}
        {isLoading ? (
          <div className="students-loading">Talabalar yuklanmoqda…</div>
        ) : (
          <>
            <div
              className={`students-table-wrap ${isFetching ? "is-fetching" : ""}`}
            >
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Talaba</th>
                    <th>Holati</th>
                    <th>Soliq hujjat</th>
                    <th>Telefon</th>
                    <th>Universitet</th>
                    <th>Kurs</th>
                    <th>Nogironlik</th>
                    <th>Intizom</th>
                    <th>Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const status = student.studentStatus || "green";
                    return (
                      <tr
                        key={student.id}
                        className={[
                          student.disciplinaryStatus === "blacklisted" ? "student-row-blacklisted" : "",
                          isContractExpiringWithinTwoDays(student.activeContractEndDate) ? "student-row-contract-expiring" : "",
                        ].filter(Boolean).join(" ")}
                      >
                        <td data-label="Talaba">
                          <div className="student-person">
                            {student.photo ? (
                              <img
                                src={
                                  student.photo.thumbnailUrl ||
                                  student.photo.url
                                }
                                alt={student.fullName}
                              />
                            ) : (
                              <span>
                                {student.fullName.slice(0, 1).toUpperCase()}
                              </span>
                            )}
                            <Link to={`/student/${student.id}`}>
                              {student.fullName}
                            </Link>
                          </div>
                        </td>
                        <td data-label="Holati">
                          <span className={`student-status-badge ${status}`}>
                            <i />
                            {studentStatusLabel[status]}
                          </span>
                        </td>
                        <td data-label="Soliq shartnomasi">
                          <span
                            className={`student-tax-contract ${student.hasTaxContract ? "checked" : "unchecked"}`}
                            role="img"
                            aria-label={
                              student.hasTaxContract
                                ? "Soliq shartnomasi mavjud"
                                : "Soliq shartnomasi mavjud emas"
                            }
                          >
                            {student.hasTaxContract ? "✓" : "×"}
                          </span>
                        </td>
                        <td data-label="Telefon">
                          <div className="student-phone">
                            <strong>{student.phone}</strong>
                            {student.parentPhone && (
                              <small>{student.parentPhone}</small>
                            )}
                          </div>
                        </td>
                        <td data-label="Universitet">
                          <div className="student-education">
                            <strong>
                              {student.university?.shortName ||
                                student.university?.name ||
                                "—"}
                            </strong>
                            <small>{student.faculty?.name || "—"}</small>
                          </div>
                        </td>
                        <td data-label="Kurs">
                          <span className="student-course">
                            {student.course}-kurs
                          </span>
                        </td>
                        <td data-label="Nogironlik">
                          <span
                            className={`student-disability ${student.disabilityStatus === "has_disability" ? "has-disability" : ""}`}
                          >
                            {student.disabilityStatus === "has_disability"
                              ? "Mavjud"
                              : "Yo‘q"}
                          </span>
                        </td>
                        <td data-label="Intizom">
                          <span
                            className={`student-discipline ${student.disciplinaryStatus}`}
                          >
                            {student.disciplinaryStatus === "blacklisted"
                              ? "Qora ro‘yxatda"
                              : student.disciplinaryStatus === "monitoring"
                                ? "Nazoratda"
                                : "Muammo yo‘q"}
                          </span>
                        </td>
                        <td data-label="Amal">
                          <div className="student-actions">
                            {canManage && <>
                            <button
                              className="student-icon-btn"
                              onClick={() => {
                                setEditing(student);
                                setModalOpen(true);
                              }}
                              aria-label="Tahrirlash"
                              title="Tahrirlash"
                            >
                              <svg viewBox="0 0 24 24">
                                <path d="M4 20H8L18 10L14 6L4 16V20Z" />
                                <path d="M12 8L16 12" />
                              </svg>
                            </button>
                            <Popconfirm
                              title="Talabani o‘chirish"
                              description="Ushbu amalni tasdiqlaysizmi?"
                              okText="O‘chirish"
                              cancelText="Bekor"
                              okButtonProps={{
                                danger: true,
                                loading: deleting,
                              }}
                              onConfirm={() => remove(student.id)}
                            >
                              <button
                                className="student-icon-btn danger"
                                disabled={deleting}
                                aria-label="O‘chirish"
                                title="O‘chirish"
                              >
                                <svg viewBox="0 0 24 24">
                                  <path d="M4 7H20M9 7V5H15V7M7 7L8 20H16L17 7" />
                                </svg>
                              </button>
                            </Popconfirm>
                            </>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!students.length && (
                    <tr>
                      <td className="students-empty" colSpan={9}>
                        Talabalar topilmadi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {pagination.total > pagination.limit && (
              <div className="students-pagination">
                <Pagination
                  current={pagination.page}
                  pageSize={pagination.limit}
                  total={pagination.total}
                  showSizeChanger={false}
                  onChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
      <StudentFormModal
        open={modalOpen}
        student={editing}
        loading={creating || updating}
        error={error}
        onClose={close}
        onSubmit={submit}
      />
      <Modal
        open={filtersModalOpen}
        title="Filterlar"
        footer={null}
        onCancel={() => setFiltersModalOpen(false)}
        className="students-filters-modal"
      >
        <div className="students-filters-modal-body">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Universitet"
            value={universityFilter}
            options={universities.map((item) => ({
              value: item.id,
              label: item.shortName || item.name,
            }))}
            onChange={(value) => {
              setUniversityFilter(value);
              setFacultyFilter(undefined);
              setPage(1);
            }}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Fakultet"
            value={facultyFilter}
            options={faculties.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            onChange={(value) => {
              setFacultyFilter(value);
              setPage(1);
            }}
          />
          <Select
            allowClear
            placeholder="Kurs"
            value={courseFilter}
            options={[1, 2, 3, 4, 5, 6].map((value) => ({
              value,
              label: `${value}-kurs`,
            }))}
            onChange={(value) => {
              setCourseFilter(value);
              setPage(1);
            }}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Xona"
            value={roomFilter}
            options={rooms.map((room) => ({
              value: room.id,
              label: `${room.block} blok · ${room.roomNumber}-xona`,
            }))}
            onChange={(value) => {
              setRoomFilter(value);
              setPage(1);
            }}
          />
          <Select
            allowClear
            placeholder="Talaba holati"
            value={statusFilter}
            options={Object.entries(studentStatusLabel).map(([value, label]) => ({
              value,
              label,
            }))}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          />
        </div>
      </Modal>
    </div>
  );
}

export function StudentsPage({ currentEmployee }) {
  const [activeTab, setActiveTab] = useState("students");
  return (
    <div className="students-module">
      <nav className="students-tabs" aria-label="Talabalar bo‘limlari">
        <button className={activeTab === "students" ? "active" : ""} onClick={() => setActiveTab("students")}>Talabalar</button>
        <button className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>Talabalar tarixi</button>
      </nav>
      {activeTab === "students" ? <StudentsListTab currentEmployee={currentEmployee} /> : <StudentHistoryTab />}
    </div>
  );
}
