"use client"

import { Button } from "@dreamteam/ui/button"
import { useCall } from "@/providers/call-provider"

const DTMF_KEYS = [
  { digit: "1", letters: "" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
  { digit: "*", letters: "" },
  { digit: "0", letters: "+" },
  { digit: "#", letters: "" },
]

export function DTMFKeypad() {
  const { sendDTMF } = useCall()

  const handlePress = async (digit: string) => {
    await sendDTMF(digit)
  }

  return (
    <div className="grid grid-cols-3 gap-2 mt-4">
      {DTMF_KEYS.map(({ digit, letters }) => (
        <Button
          key={digit}
          variant="outline"
          className="h-14 flex flex-col items-center justify-center"
          onClick={() => handlePress(digit)}
        >
          <span className="text-lg font-semibold">{digit}</span>
          {letters && (
            <span className="text-[10px] text-muted-foreground tracking-wider">
              {letters}
            </span>
          )}
        </Button>
      ))}
    </div>
  )
}
