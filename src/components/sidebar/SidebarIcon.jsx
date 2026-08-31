import {
  ApartmentOutlined,
  AuditOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CreditCardOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  HomeOutlined,
  IdcardOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  UserSwitchOutlined,
  ScanOutlined,
  WalletOutlined,
} from '@ant-design/icons'

export function SidebarIcon({ name }) {
  const icons = {
    home: HomeOutlined,
    students: TeamOutlined,
    contracts: FileTextOutlined,
    rooms: ApartmentOutlined,
    attendance: CalendarOutlined,
    'face-access': ScanOutlined,
    payments: CreditCardOutlined,
    cash: WalletOutlined,
    debtors: UserSwitchOutlined,
    fines: AuditOutlined,
    employees: IdcardOutlined,
    salaries: WalletOutlined,
    shop: ShopOutlined,
    expenses: ShoppingCartOutlined,
    reports: BarChartOutlined,
    settings: SettingOutlined,
  }
  const Icon = icons[name] || FileDoneOutlined
  return <Icon className="sidebar-icon" aria-hidden="true" />
}
