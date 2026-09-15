import type { FormulaId } from "./chambers";

export const FORMULA_LESSONS: Record<FormulaId, {
  spokenEquation: string;
  meaning: string[];
  example: string[];
  experiment: string;
}> = {
  ohm: {
    spokenEquation: "Voltage equals current times resistance.",
    meaning: [
      "Voltage is the electrical push between two points. Current is the rate at which charge flows. Resistance makes that flow harder.",
      "V stands for voltage, measured in volts. I stands for current, measured in amps. R stands for resistance, measured in ohms.",
      "Keep the voltage the same and increase the resistance: less current flows. Keep the resistance the same and increase the voltage: more current flows.",
    ],
    example: [
      "In this lab, a bulb has a resistance of twelve ohms. With six volts across it, the current is six divided by twelve. That is half an amp.",
      "Use the voltage across the part you are studying. If a resistor shares the circuit with the bulb, the battery's voltage is split between them.",
    ],
    experiment: "Add a resistor in series with the bulb. Increase its resistance and watch the bulb's current and brightness fall. The bulb still needs a complete path back to the battery.",
  },
  series: {
    spokenEquation: "The supply voltage equals the voltage across the first part plus the voltage across the second.",
    meaning: [
      "In a series circuit, the parts sit along one continuous path. The same current passes through every part. It is not used up as it goes.",
      "V means voltage. The small s means supply. The small one and two identify the two parts. With very little resistance in the wires, the two voltage drops add up to the supply voltage.",
      "Matching resistances share the voltage equally. If the resistances differ, the larger resistance gets the larger voltage drop.",
    ],
    example: [
      "Connect two matching bulbs in series to a twelve-volt supply. Each bulb gets about six volts. Six plus six gives the full twelve volts.",
      "If you open the path anywhere, current stops through both bulbs. Every part depends on that one complete loop.",
    ],
    experiment: "Build a single path through both bulbs and back to the battery. Compare their voltages, then disconnect one wire. Watch what happens to both lights.",
  },
  parallel: {
    spokenEquation: "The voltage across the first branch equals the voltage across the second branch and equals the supply voltage.",
    meaning: [
      "Parallel branches connect across the same two supply points. Each branch has its own path between the battery's positive and negative contacts.",
      "V means voltage. The small one and two identify the branches. The small s means supply. Each branch spans the full supply voltage.",
      "Equal voltage does not always mean equal current. A branch with less resistance takes more current. The battery supplies the total current used by all the branches.",
    ],
    example: [
      "Put two bulbs on separate branches of a six-volt supply. Each bulb gets about six volts. The voltage is not divided between them.",
      "Open a switch in just one branch, and the other bulb can stay lit. A switch on a wire shared by both branches would turn both off.",
    ],
    experiment: "Give the second bulb its own path to both battery contacts. Then open the first bulb's switch. The second bulb should keep shining.",
  },
};
