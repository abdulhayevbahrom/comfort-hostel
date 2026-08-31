import { useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Segmented,
  Select,
  Upload,
} from "antd";
import { FaBed, FaPlus, FaXmark } from "react-icons/fa6";
import { GiBunkBeds } from "react-icons/gi";
import { useGetBuildingBlocksQuery } from "../../store/baseApi";
import { categoryOptions, genderOptions } from "./roomConstants";

const initialValues = {
  roomNumber: "",
  block: undefined,
  floor: "1",
  bedLayout: [],
  category: undefined,
  gender: "male",
  status: "available",
  note: "",
};
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 8 * 1024 * 1024;
const maxImageCount = 8;

export function RoomFormModal({
  open,
  room,
  loading,
  error,
  onClose,
  onSubmit,
}) {
  const [form] = Form.useForm();
  const [newImages, setNewImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const { data: blockData } = useGetBuildingBlocksQuery();
  const editing = Boolean(room);
  const bedLayout = Form.useWatch("bedLayout", { form, preserve: true }) || [];
  const blockOptions = (blockData?.blocks || []).map((item) => ({
    value: item.name,
    label: item.name,
  }));

  const prepareModal = (visible) => {
    if (!visible) return;
    const legacyLayout = Array.from(
      { length: Math.ceil(Number(room?.capacity || 0) / 2) },
      (_, index) => ({
        number: index + 1,
        type: index * 2 + 2 <= room.capacity ? "bunk" : "single",
        slotNumbers:
          index * 2 + 2 <= room.capacity
            ? [index * 2 + 1, index * 2 + 2]
            : [index * 2 + 1],
      }),
    );
    const savedLayout = room?.bedLayout?.length
      ? room.bedLayout.map((bed, index) => ({
          ...bed,
          slotNumbers: bed.slotNumbers?.length
            ? bed.slotNumbers
            : legacyLayout[index]?.slotNumbers || [],
        }))
      : legacyLayout;
    form.setFieldsValue(
      room ? { ...room, bedLayout: savedLayout } : initialValues,
    );
    setExistingImages(room?.images || []);
    setNewImages([]);
  };

  const validateImage = (file) => {
    if (!allowedImageTypes.has(file.type)) {
      message.error(
        `${file.name}: faqat JPG, PNG yoki WEBP formatidagi rasmni yuklash mumkin`,
      );
      return Upload.LIST_IGNORE;
    }
    if (file.size > maxImageSize) {
      message.error(`${file.name}: rasm hajmi 8 MB dan oshmasligi kerak`);
      return Upload.LIST_IGNORE;
    }
    if (existingImages.length + newImages.length >= maxImageCount) {
      message.error("Bitta xona uchun eng ko‘pi 8 ta rasm yuklash mumkin");
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const changeImages = ({ fileList }) => {
    const availableSlots = maxImageCount - existingImages.length;
    if (fileList.length > availableSlots)
      message.error("Bitta xona uchun eng ko‘pi 8 ta rasm yuklash mumkin");
    setNewImages(fileList.slice(0, availableSlots));
  };
  const addBed = (type) => {
    const nextNumber =
      Math.max(0, ...bedLayout.map((item) => Number(item.number) || 0)) + 1;
    const nextSlotNumber =
      Math.max(
        0,
        ...bedLayout.flatMap((item) => item.slotNumbers || []).map(Number),
      ) + 1;
    form.setFieldValue("bedLayout", [
      ...bedLayout,
      {
        number: nextNumber,
        type,
        slotNumbers:
          type === "bunk"
            ? [nextSlotNumber, nextSlotNumber + 1]
            : [nextSlotNumber],
      },
    ]);
  };
  const updateSlotNumber = (bedIndex, slotIndex, number) => {
    const slotNumber = Number(number);
    const duplicate = bedLayout.some((bed, currentBedIndex) =>
      (bed.slotNumbers || []).some(
        (slot, currentSlotIndex) =>
          currentBedIndex !== bedIndex || currentSlotIndex !== slotIndex
            ? Number(slot) === slotNumber
            : false,
      ),
    );
    if (Number.isFinite(slotNumber) && duplicate) {
      message.error(`O‘rin raqami ${slotNumber} avval kiritilgan`);
      return;
    }
    form.setFieldValue(
      "bedLayout",
      bedLayout.map((item, itemIndex) =>
        itemIndex === bedIndex
          ? {
              ...item,
              slotNumbers: item.slotNumbers.map((slot, index) =>
                index === slotIndex ? number : slot,
              ),
            }
          : item,
      ),
    );
  };
  const removeBed = (index) =>
    form.setFieldValue(
      "bedLayout",
      bedLayout.filter((_, itemIndex) => itemIndex !== index),
    );
  const capacity = bedLayout.reduce(
    (sum, item) => sum + (item.type === "bunk" ? 2 : 1),
    0,
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      afterOpenChange={prepareModal}
      footer={null}
      destroyOnHidden
      width={760}
      rootClassName="hostel-room-modal"
      title={editing ? "Xonani tahrirlash" : "Yangi xona qo‘shish"}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={(values) => {
          const currentBedLayout = form.getFieldValue("bedLayout") || bedLayout;
          if (!currentBedLayout.length)
            return message.error("Kamida bitta krovat qo‘shing");
          const slotNumbers = currentBedLayout.flatMap((bed) => bed.slotNumbers || []).map(Number);
          if (new Set(slotNumbers).size !== slotNumbers.length)
            return message.error("O‘rin raqamlari bir xil bo‘lmasligi kerak");
          onSubmit({
            values: { ...values, bedLayout: currentBedLayout },
            newImages,
            existingImages,
          });
        }}
        requiredMark={false}
      >
        <div className="room-form-grid">
          <Form.Item
            name="roomNumber"
            label="Xona raqami"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "Xona raqami majburiy",
              },
            ]}
          >
            <Input placeholder="Masalan: 305" />
          </Form.Item>
          <Form.Item name="block" label="Bino yoki blok (ixtiyoriy)">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Tanlanmagan"
              options={blockOptions}
              notFoundContent="Sozlamalardan bino yoki blok qo‘shing"
            />
          </Form.Item>
          <Form.Item
            name="floor"
            label="Qavat"
            rules={[
              { required: true, whitespace: true, message: "Qavatni kiriting" },
            ]}
          >
            <Input maxLength={30} placeholder="Masalan: -1" />
          </Form.Item>
          <Form.Item label="Umumiy o‘rinlar">
            <Input value={`${capacity} ta o‘rin`} disabled />
          </Form.Item>
          <Form.Item name="category" label="Xona toifasi (ixtiyoriy)">
            <Select
              allowClear
              placeholder="Tanlanmagan"
              options={categoryOptions}
            />
          </Form.Item>
          <Form.Item name="gender" label="Kimlar uchun">
            <Select options={genderOptions} />
          </Form.Item>
        </div>
        <Form.Item label="Krovatlar va o‘rinlar" required>
          <div className="room-bed-layout-actions">
            <Button
              htmlType="button"
              type="default"
              onClick={() => addBed("single")}
              icon={<FaBed />}
            >
              <FaPlus />
            </Button>
            <Button
              htmlType="button"
              type="default"
              onClick={() => addBed("bunk")}
              icon={<GiBunkBeds />}
            >
              <FaPlus />
            </Button>
          </div>
          <div className="room-bed-layout-list">
            {bedLayout.map((bed, index) => (
              <div
                className="room-bed-layout-item"
                key={`${bed.type}-${index}`}
              >
                <span
                  className={`room-bed-icon ${bed.type}`}
                  title={
                    bed.type === "bunk"
                      ? "Ikki qavatli krovat"
                      : "Bir qavatli krovat"
                  }
                >
                  {bed.type === "bunk" ? <GiBunkBeds /> : <FaBed />}
                </span>
                <div className="room-bed-slot-inputs">
                  {(bed.slotNumbers || []).map((slotNumber, slotIndex) => (
                    <InputNumber
                      key={slotIndex}
                      min={1}
                      value={slotNumber}
                      onChange={(value) =>
                        updateSlotNumber(index, slotIndex, value)
                      }
                      addonBefore={
                        bed.type === "bunk"
                          ? slotIndex === 0
                            ? "Pastki o‘rin"
                            : "Yuqori o‘rin"
                          : "O‘rin raqami"
                      }
                    />
                  ))}
                </div>
                <Button
                  danger
                  type="text"
                  className="room-bed-remove-btn"
                  icon={<FaXmark />}
                  aria-label="Krovatni o‘chirish"
                  title="Krovatni o‘chirish"
                  onClick={() => removeBed(index)}
                />
              </div>
            ))}
          </div>
          {!bedLayout.length && (
            <div className="room-image-help">
              Avval krovat turini tanlab qo‘shing.
            </div>
          )}
        </Form.Item>
        <Form.Item label="Xona rasmlari">
          <div className="room-image-editor">
            {existingImages.map((image, index) => (
              <div className="room-image-item" key={image.url}>
                <img
                  src={image.thumbnailUrl || image.url}
                  alt={`Xona rasmi ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setExistingImages((items) =>
                      items.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
            {existingImages.length + newImages.length < maxImageCount && (
              <Upload
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                listType="picture-card"
                fileList={newImages}
                multiple
                beforeUpload={validateImage}
                onChange={changeImages}
              >
                <div className="room-upload-button">
                  <b>+</b>
                  <span>Rasm qo‘shish</span>
                </div>
              </Upload>
            )}
          </div>
          <div className="room-image-help">
            Qoidalar: faqat JPG, PNG yoki WEBP · har bir rasm 8 MB gacha · jami
            ko‘pi bilan 8 ta
          </div>
        </Form.Item>
        {editing && (
          <Form.Item name="status" label="Xona holati">
            <Segmented
              className="room-status-segmented"
              block
              options={[
                { label: "Aktiv", value: "available" },
                { label: "Ta’mirda", value: "maintenance" },
              ]}
            />
          </Form.Item>
        )}
        <Form.Item name="note" label="Izoh">
          <Input.TextArea
            rows={3}
            placeholder="Xona haqida qo‘shimcha ma’lumot"
          />
        </Form.Item>
        {error && <div className="form-error">{error}</div>}
        <div className="room-form-actions">
          <Button htmlType="submit" loading={loading} className="room-save-btn">
            {editing ? "Yangilash" : "Saqlash"}
          </Button>
          <Button onClick={onClose}>Yopish</Button>
        </div>
      </Form>
    </Modal>
  );
}
