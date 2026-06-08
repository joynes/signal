import styled from "@emotion/styled"
import type { FC } from "react"
import { AutoScrollButton } from "../../../../components/Toolbar/AutoScrollButton"
import { QuantizeSelector } from "../../../../components/Toolbar/QuantizeSelector/QuantizeSelector"
import { Toolbar } from "../../../../components/Toolbar/Toolbar"
import { TrackListMenuButton } from "../../../../components/TrackList/TrackListMenuButton"
import { EventListButton } from "./EventListButton"
import { InstrumentButton } from "./InstrumentButton"
import { PanSlider } from "./PanSlider"
import { PianoRollToolSelector } from "./PianoRollToolSelector"
import { TrackNameInput } from "./TrackNameInput"
import { VolumeSlider } from "./VolumeSlider"

const Spacer = styled.div`
  width: 1rem;
`

const FlexibleSpacer = styled.div`
  flex-grow: 1;
`

export const PianoRollToolbar: FC = () => {
  return (
    <Toolbar>
      <TrackListMenuButton />

      <TrackNameInput />

      <EventListButton />

      <Spacer />

      <InstrumentButton />

      <VolumeSlider />
      <PanSlider />

      <FlexibleSpacer />

      <PianoRollToolSelector />

      <QuantizeSelector />

      <AutoScrollButton />
    </Toolbar>
  )
}
