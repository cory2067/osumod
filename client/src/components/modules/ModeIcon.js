import React from "react";
import * as d3 from "d3";

import Icon from "@ant-design/icons";

import StandardIcon from "../../public/mode-osu.svg";
import TaikoIcon from "../../public/mode-taiko.svg";
import CatchIcon from "../../public/mode-ctb.svg";
import ManiaIcon from "../../public/mode-mania.svg";

// keys are mode strings as returned by osu api
const iconMap = {
  Standard: StandardIcon,
  Taiko: TaikoIcon,
  "Catch the Beat": CatchIcon,
  Mania: ManiaIcon,
};

// https://github.com/ppy/osu-web/blob/87212089ea72cae7c6dbcde78450516181ccb96c/resources/js/utils/beatmap-helper.ts
const difficultyColourSpectrum = d3
  .scaleLinear()
  .domain([0.1, 1.25, 2, 2.5, 3.3, 4.2, 4.9, 5.8, 6.7, 7.7, 9])
  .clamp(true)
  .range([
    "#4290FB",
    "#4FC0FF",
    "#4FFFD5",
    "#7CFF4F",
    "#F6F05C",
    "#FF8068",
    "#FF4E6F",
    "#C645B8",
    "#6563DE",
    "#18158E",
    "#000000",
  ])
  .interpolate(d3.interpolateRgb.gamma(2.2));

const getDiffColor = (rating) => {
  if (rating < 0.1) return "#AAAAAA";
  if (rating >= 9) return "#000000";
  return difficultyColourSpectrum(rating);
};

function ModeIcon(props) {
  return (
    <Icon
      style={{
        color: props.sr !== undefined ? getDiffColor(props.sr) : "inherit",
        fontSize: props.size ?? 24,
        padding: props.padding ?? 7,
      }}
      component={iconMap[props.mode]}
    />
  );
}

export default ModeIcon;
