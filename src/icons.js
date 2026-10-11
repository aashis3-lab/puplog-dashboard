import {
  Bone, Droplets, Footprints, MessageSquare, Package, PawPrint, Pill, Scissors, Smile,
  Stethoscope, Syringe, Thermometer, Toilet, Trees, Utensils, Volleyball, Weight,
} from "lucide-react";

// Icon for each kind of log, by its key in Config.gs. Anything not listed gets a paw print.
const ACTION_ICONS = {
  food: Utensils,
  water: Droplets,
  backyard: Trees,
  walk: Footprints,
  potty: Toilet,
  treats: Bone,
  play: Volleyball,
  teeth: Smile,
  meds: Pill,
  vaccine: Syringe,
  vet: Stethoscope,
  weight: Weight,
  symptom: Thermometer,
  grooming: Scissors,
  supplies: Package,
  note: MessageSquare,
};

export const iconFor = key => ACTION_ICONS[key] || PawPrint;
