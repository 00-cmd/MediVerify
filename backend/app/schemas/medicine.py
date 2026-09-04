from pydantic import BaseModel


class MedicineCreate(BaseModel):

    name: str

    manufacturer_name: str

    composition: str | None = None

    description: str | None = None