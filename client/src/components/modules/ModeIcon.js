import React from "react";

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

// https://github.com/ppy/osu-web/blob/master/resources/assets/lib/utils/beatmap-helper.ts
const getDiffColor = (rating) => {
  if (rating < 2) return "#88b300";
  if (rating < 2.7) return "#66ccff";
  if (rating < 4) return "#ffcc22";
  if (rating < 5.3) return "#ff66aa";
  if (rating < 6.5) return "#aa88ff";
  return "#121415";
};

function ModeIcon(props) {
  return (
    <Icon
      style={{
        color: props.sr !== undefined ? getDiffColor(props.sr) : "inherit",
        fontSize: props.size ?? 24,
        padding: props.padding ?? 5,
      }}
      component={iconMap[props.mode]}
    />
  );
}

export default ModeIcon;
