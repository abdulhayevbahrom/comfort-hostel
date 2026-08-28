import { useState } from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { apiErrorMessage, useGetDashboardQuery } from "../../store/baseApi";
import "./Dashboard.css";

const money = (value) => `${Number(value || 0).toLocaleString("uz-UZ")} so‘m`;
const compact = (value) => {
  const amount = Number(value || 0);
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(1)} mlrd`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(1)} mln`;
  if (amount >= 1e3) return `${Math.round(amount / 1e3)} ming`;
  return amount.toLocaleString("uz-UZ");
};
const methodLabels = {
  cash: "Naqd",
  card: "Karta",
  bank: "Bank o‘tkazma",
  online: "Click / Online",
};

function CardIcon({ type }) {
  const paths = {
    income: (
      <>
        <path d="M5 19 19 5M10 5h9v9" />
      </>
    ),
    expense: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </>
    ),
    balance: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M15 11h6v4h-6a2 2 0 0 1 0-4Z" />
      </>
    ),
    salary: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9.5c0-1 1.2-1.8 3-1.8s3 .7 3 1.8-1 1.7-3 2-3 1-3 2 1.2 1.8 3 1.8 3-.8 3-1.8M12 6v12" />
      </>
    ),
    debt: (
      <>
        <path d="M4 7h16v12H4zM7 4h10v3" />
        <path d="M14 12h6v4h-6a2 2 0 0 1 0-4Z" />
      </>
    ),
    students: (
      <>
        <circle cx="8" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3 20c0-4 2-7 5-7s5 3 5 7M14 14c3-1 6 1 7 5" />
      </>
    ),
    rooms: (
      <>
        <path d="M3 20V5h14v15M17 9h4v11M2 20h20" />
        <path d="M7 8h3M7 12h3M7 16h3M13 8h1M13 12h1" />
      </>
    ),
    employee: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-5 3-8 8-8s8 3 8 8" />
      </>
    ),
    fine: (
      <>
        <path d="M12 3 3 20h18L12 3Z" />
        <path d="M12 9v5M12 17v.1" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[type]}
    </svg>
  );
}

function StatCard({ tone, icon, label, value, detail, onClick }) {
  return (
    <button className={`summary-card ${tone}`} onClick={onClick}>
      <div>
        <i>
          <CardIcon type={icon} />
        </i>
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </button>
  );
}

function DailyLineChart({ rows }) {
  const [hover, setHover] = useState(null);
  const width = 1100,
    height = 220,
    left = 62,
    right = 18,
    top = 18,
    bottom = 30;
  const plotW = width - left - right,
    plotH = height - top - bottom;
  const max = Math.max(1, ...rows.flatMap((row) => [row.income, row.expenses]));
  const x = (i) => left + (plotW / Math.max(1, rows.length - 1)) * i;
  const y = (v) => top + plotH - (v / max) * plotH;
  const income = rows.map((row, i) => `${x(i)},${y(row.income)}`).join(" ");
  const expense = rows.map((row, i) => `${x(i)},${y(row.expenses)}`).join(" ");
  const area = `${left},${top + plotH} ${income} ${left + plotW},${top + plotH}`;
  return (
    <div className="daily-chart-wrap">
      <svg
        className="daily-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Kunlik tushum va xarajat grafigi"
      >
        <defs>
          <linearGradient id="dailyArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2d8177" stopOpacity=".22" />
            <stop offset="1" stopColor="#2d8177" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((tick) => (
          <g key={tick}>
            <line
              x1={left}
              y1={top + plotH * tick}
              x2={left + plotW}
              y2={top + plotH * tick}
            />
            <text x={left - 9} y={top + plotH * tick + 4} textAnchor="end">
              {compact(max * (1 - tick))}
            </text>
          </g>
        ))}
        <polygon points={area} fill="url(#dailyArea)" />
        <polyline points={income} className="income-line" />
        <polyline points={expense} className="expense-line" />
        {rows.map((row, i) => (
          <g
            key={row.day}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <rect
              x={x(i) - 12}
              y={top}
              width="24"
              height={plotH}
              fill="transparent"
            />
            <circle
              cx={x(i)}
              cy={y(row.income)}
              r={hover === i ? 4 : 2.5}
              className="income-dot"
            />
            <circle
              cx={x(i)}
              cy={y(row.expenses)}
              r={hover === i ? 4 : 2.5}
              className="expense-dot"
            />
            <text x={x(i)} y={height - 8} textAnchor="middle">
              {row.day}
            </text>
            {hover === i && (
              <g className="daily-tooltip">
                <rect
                  x={Math.min(width - 150, Math.max(5, x(i) - 65))}
                  y="3"
                  width="145"
                  height="45"
                  rx="7"
                />
                <text x={Math.min(width - 140, Math.max(15, x(i) - 55))} y="21">
                  Tushum: {compact(row.income)}
                </text>
                <text x={Math.min(width - 140, Math.max(15, x(i) - 55))} y="38">
                  Xarajat: {compact(row.expenses)}
                </text>
              </g>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function RoomDonut({ rooms }) {
  const total = Math.max(1, Number(rooms.total || 0));
  const occupiedRooms = Math.min(
    rooms.available || 0,
    Math.ceil(((rooms.available || 0) * (rooms.occupancyRate || 0)) / 100),
  );
  const freeRooms = Math.max(0, (rooms.available || 0) - occupiedRooms);
  const repair = rooms.maintenance || 0;
  const circumference = 2 * Math.PI * 54;
  const occupiedLength = (circumference * occupiedRooms) / total;
  const freeLength = (circumference * freeRooms) / total;
  return (
    <div className="room-chart">
      <div className="donut">
        <svg viewBox="0 0 130 130">
          <circle cx="65" cy="65" r="54" className="donut-bg" />
          <circle
            cx="65"
            cy="65"
            r="54"
            className="donut-occupied"
            strokeDasharray={`${occupiedLength} ${circumference - occupiedLength}`}
          />
          <circle
            cx="65"
            cy="65"
            r="54"
            className="donut-free"
            strokeDasharray={`${freeLength} ${circumference - freeLength}`}
            strokeDashoffset={-occupiedLength}
          />
          <circle
            cx="65"
            cy="65"
            r="54"
            className="donut-repair"
            strokeDasharray={`${(circumference * repair) / total} ${circumference}`}
            strokeDashoffset={-(occupiedLength + freeLength)}
          />
        </svg>
        <span>
          <strong>{rooms.total || 0}</strong>
          <small>xona</small>
        </span>
      </div>
      <div className="room-legend">
        <div>
          <i className="occupied" />
          <span>Band xonalar</span>
          <b>{occupiedRooms} ta</b>
        </div>
        <div>
          <i className="free" />
          <span>Bo‘sh xonalar</span>
          <b>{freeRooms} ta</b>
        </div>
        <div>
          <i className="beds" />
          <span>Bo‘sh o‘rinlar</span>
          <b>{rooms.free || 0} ta</b>
        </div>
        <div>
          <i className="repair" />
          <span>Ta’mirdagi</span>
          <b>{repair} ta</b>
        </div>
        <footer>
          <em>Jami: {rooms.total || 0} ta</em>
          <em>Bandlik: {rooms.occupancyRate || 0}%</em>
        </footer>
      </div>
    </div>
  );
}

function AttendanceDonut({ attendance }) {
  const total = Math.max(1, Number(attendance.total || 0));
  const circumference = 2 * Math.PI * 54;
  const items = [
    { key: "present", label: "Keldi", value: attendance.present || 0 },
    { key: "late", label: "Kechikdi", value: attendance.late || 0 },
    { key: "absent", label: "Kelmadi", value: attendance.absent || 0 },
    { key: "unmarked", label: "Belgilanmagan", value: attendance.unmarked || 0 },
  ];
  let offset = 0;
  return (
    <div className="attendance-chart">
      <div className="attendance-donut">
        <svg viewBox="0 0 130 130">
          <circle cx="65" cy="65" r="54" className="attendance-donut-bg" />
          {items.map((item) => {
            const length = (circumference * item.value) / total;
            const segment = (
              <circle key={item.key} cx="65" cy="65" r="54" className={`attendance-segment ${item.key}`} strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} />
            );
            offset += length;
            return segment;
          })}
        </svg>
        <span><strong>{attendance.total || 0}</strong><small>talaba</small></span>
      </div>
      <div className="attendance-legend">
        {items.map((item) => <div key={item.key}><i className={item.key} /><span>{item.label}</span><b>{item.value} ta</b><em>{attendance.total ? Math.round((item.value / attendance.total) * 100) : 0}%</em></div>)}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(() => [dayjs().startOf("month"), dayjs()]);
  const [methodPeriod, setMethodPeriod] = useState("month");
  const [rangeStart, rangeEnd] = dateRange;
  const { data, isLoading, isFetching, error, refetch } = useGetDashboardQuery({
    startDate: rangeStart.format("YYYY-MM-DD"),
    endDate: rangeEnd.format("YYYY-MM-DD"),
  });
  if (isLoading)
    return (
      <div className="dashboard-loading">
        <span />
        Dashboard tayyorlanmoqda
      </div>
    );
  if (error)
    return (
      <div className="dashboard-error">
        <p>{apiErrorMessage(error)}</p>
        <button onClick={refetch}>Qayta yuklash</button>
      </div>
    );
  const f = data.finance || {},
    d = data.debt || {},
    r = data.rooms || {},
    a = data.attendance || {};
  const rangeLabel = `${rangeStart.format("DD.MM.YYYY")} — ${rangeEnd.format("DD.MM.YYYY")}`;
  const selectedMethods =
    methodPeriod === "month"
      ? data.paymentMethods || []
      : data.dailyPaymentMethods || [];
  const methods = Object.fromEntries(
    selectedMethods.map((item) => [item._id, item]),
  );
  const methodMax = Math.max(1, ...selectedMethods.map((item) => item.amount));
  return (
    <div className={`reference-dashboard ${isFetching ? "refreshing" : ""}`}>
      <div className="dashboard-toolbar">
        <div>
          <h1>Boshqaruv paneli</h1>
          <p>Barcha muhim ko‘rsatkichlar bir joyda</p>
        </div>
        <div className="dashboard-date-filters">
          <DatePicker.RangePicker
            allowClear={false}
            value={dateRange}
            format="DD.MM.YYYY"
            disabledDate={(current) =>
              current && current.isAfter(dayjs(), "day")
            }
            onChange={(value) => value?.[0] && value?.[1] && setDateRange(value)}
          />
        </div>
      </div>
      <section className="summary-grid">
        <StatCard
          tone="purple"
          icon="income"
          label="Davr kirimi"
          value={money(f.todayIncome)}
          detail={`${rangeLabel} oralig‘ida qabul qilingan kirimlar`}
          onClick={() => navigate("/payments")}
        />
        <StatCard
          tone="red"
          icon="expense"
          label="Davr xarajati"
          value={money(f.todayExpense)}
          detail={`${rangeLabel} oralig‘ida kiritilgan xarajatlar`}
          onClick={() => navigate("/expenses")}
        />
        <StatCard
          tone="cyan"
          icon="balance"
          label="Davr balansi"
          value={money(f.todayBalance)}
          detail="Davr kirimi − xarajati"
        />
        <StatCard
          tone="purple"
          icon="income"
          label="Jami kirim"
          value={money(f.income)}
          detail={`${rangeLabel} bo‘yicha ${f.incomeCount || 0} ta kirim`}
          onClick={() => navigate("/payments")}
        />
        <StatCard
          tone="red"
          icon="expense"
          label="Jami xarajat"
          value={money(f.expenses)}
          detail={`${rangeLabel} bo‘yicha ${f.expenseCount || 0} ta xarajat`}
          onClick={() => navigate("/expenses")}
        />
        <StatCard
          tone="orange"
          icon="salary"
          label="Berilgan oylik"
          value={money(f.salaryPaid)}
          detail={`Hisoblangan oylik: ${money(f.salaryFund)}`}
          onClick={() => navigate("/salaries")}
        />
        <StatCard
          tone="cyan"
          icon="balance"
          label="Jami balans"
          value={money(f.balance)}
          detail="Oy kirimi − xarajat − berilgan oylik"
        />
        <StatCard
          tone="slate"
          icon="balance"
          label="Davr hisobi"
          value={money(f.income + d.amount)}
          detail={`Talabalardan olinishi kerak bo‘lgan jami summa`}
        />
        <StatCard
          tone="pink"
          icon="debt"
          label="Talabalar jami qarzi"
          value={money(d.amount)}
          detail={`${rangeEnd.format("MMMM YYYY")} qarzi · ${d.students || 0} talaba`}
          onClick={() => navigate("/debtors")}
        />
      </section>

      <section className="overview-row">
        <article className="light-panel center-status">
          <h2>Yotoqxona holati</h2>
          <div>
            <button onClick={() => navigate("/contracts")}>
              <i className="pink">
                <CardIcon type="students" />
              </i>
              <span>
                <b>Faol yashovchilar</b>
                <strong>{data.students?.active || 0}</strong>
                <small>Aktiv shartnomali talabalar</small>
              </span>
            </button>
            <button onClick={() => navigate("/rooms")}>
              <i className="blue">
                <CardIcon type="rooms" />
              </i>
              <span>
                <b>Xonalar</b>
                <strong>{r.total || 0}</strong>
                <small>{r.free || 0} ta bo‘sh joy</small>
              </span>
            </button>
            <button onClick={() => navigate("/employees")}>
              <i className="gold">
                <CardIcon type="employee" />
              </i>
              <span>
                <b>Xodimlar</b>
                <strong>{data.employees?.active || 0}</strong>
                <small>Faol xodimlar</small>
              </span>
            </button>
            <button onClick={() => navigate("/fines")}>
              <i className="green">
                <CardIcon type="fine" />
              </i>
              <span>
                <b>Jarimalar</b>
                <strong>{d.fineStudents || 0}</strong>
                <small>{money(d.fineAmount)} qoldiq</small>
              </span>
            </button>
          </div>
        </article>
        <article className="light-panel rooms-panel">
          <header>
            <h2>Xonalar holati</h2>
            <span>{rangeEnd.format("DD.MM.YYYY")}</span>
          </header>
          <RoomDonut rooms={r} />
        </article>
        <article className="light-panel payment-methods">
          <div className="payment-method-head">
            <h2>To‘lov usullari</h2>
            <span>
              <button
                className={methodPeriod === "month" ? "active" : ""}
                onClick={() => setMethodPeriod("month")}
              >
                Davr
              </button>
              <button
                className={methodPeriod === "day" ? "active" : ""}
                onClick={() => setMethodPeriod("day")}
              >
                Oxirgi kun
              </button>
            </span>
          </div>
          {["cash", "card", "bank", "online"].map((key) => (
            <div key={key}>
              <span>
                {methodLabels[key]}
                <b>{money(methods[key]?.amount)}</b>
              </span>
              <i>
                <em
                  style={{
                    width: `${((methods[key]?.amount || 0) / methodMax) * 100}%`,
                  }}
                />
              </i>
            </div>
          ))}
        </article>
      </section>

      <section className="visual-row">
        <article className="light-panel attendance-panel">
          <header>
            <h2>Davomat (oxirgi kun)</h2>
            <span>{rangeEnd.format("DD.MM.YYYY")}</span>
          </header>
          <AttendanceDonut attendance={a} />
        </article>
        <article className="light-panel debtors-panel">
          <header>
            <h2>Eng katta qarzdorlar</h2>
            <button onClick={() => navigate("/debtors")}>Barchasi →</button>
          </header>
          <table>
            <thead>
              <tr>
                <th>Talaba</th>
                <th>Xona</th>
                <th>Qarz</th>
              </tr>
            </thead>
            <tbody>
              {(data.topDebtors || []).map((item) => (
                <tr key={item.student.id}>
                  <td>
                    <strong>{item.student.fullName}</strong>
                  </td>
                  <td>
                    {item.room
                      ? `${item.room.block} · ${item.room.roomNumber}`
                      : "—"}
                  </td>
                  <td>
                    <b>{money(item.debt)}</b>
                  </td>
                </tr>
              ))}
              {!data.topDebtors?.length && (
                <tr>
                  <td colSpan="3" className="empty">
                    Qarzdorlar yo‘q
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </article>
      </section>

      <section className="light-panel dynamics-panel">
        <header>
          <div>
            <h2>Tanlangan davr dinamikasi</h2>
            <span className="chart-keys">
              <i className="income" />
              Tushgan to‘lov <i className="expense" />
              Xarajat
            </span>
          </div>
          <span>{rangeLabel}</span>
        </header>
        <div className="chart-totals">
          <b>Jami tushum: {money(f.income)}</b>
          <b>Jami xarajat: {money(f.expenses)}</b>
        </div>
        <DailyLineChart rows={data.dailyTrends || []} />
      </section>

      <section className="light-panel recent-panel">
        <header>
          <h2>Oxirgi amallar</h2>
          <span>So‘nggi pul harakatlari</span>
        </header>
        <div className="recent-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sana</th>
                <th>Amal</th>
                <th>Nomi</th>
                <th>Summa</th>
              </tr>
            </thead>
            <tbody>
              {(data.transactions || []).map((item) => (
                <tr key={item.id}>
                  <td className="recent-date-cell">
                    <strong>{dayjs(item.createdAt).format("DD.MM.YYYY")}</strong>
                    <small>{dayjs(item.createdAt).format("HH:mm")}</small>
                  </td>
                  <td>
                    <div className="recent-action-cell">
                      <span className={`operation ${item.type}`}>
                        {item.type === "income"
                          ? "Kirim"
                          : item.type === "salary"
                            ? "Oylik"
                            : "Xarajat"}
                      </span>
                      <b className={item.type}>
                        {item.type === "income" ? "+" : "−"} {money(item.amount)}
                      </b>
                    </div>
                  </td>
                  <td>
                    <strong>{item.title}</strong>
                    <small>{item.subtitle}</small>
                  </td>
                  <td className="recent-amount-cell">
                    <b className={item.type}>
                      {item.type === "income" ? "+" : "−"} {money(item.amount)}
                    </b>
                  </td>
                </tr>
              ))}
              {!data.transactions?.length && (
                <tr>
                  <td colSpan="4" className="empty">
                    Ma’lumot topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
