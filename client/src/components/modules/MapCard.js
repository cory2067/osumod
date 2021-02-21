import React, { Component } from "react";
import Icon, {
  InfoCircleTwoTone,
  CloseCircleTwoTone,
  CheckCircleTwoTone,
  ProfileTwoTone,
  HeartTwoTone,
  LikeTwoTone,
  StarOutlined,
  ClockCircleTwoTone,
  DashboardTwoTone,
} from "@ant-design/icons";
import { Link } from "@reach/router";

import StandardIcon from "../../public/mode-osu.svg";
import TaikoIcon from "../../public/mode-taiko.svg";
import CatchIcon from "../../public/mode-ctb.svg";
import ManiaIcon from "../../public/mode-mania.svg";

import { Card, Tooltip } from "antd";
import "./MapCard.css";

const icons = {
  Pending: InfoCircleTwoTone,
  Rejected: CloseCircleTwoTone,
  Accepted: CheckCircleTwoTone,
  Modded: ProfileTwoTone,
  Nominated: LikeTwoTone,
  Finished: LikeTwoTone,
  Ranked: HeartTwoTone,
};

const colors = {
  Pending: "#aaaaaa",
  Accepted: "#52c41a",
  Modded: "#17bebb",
  Rejected: "#f8333c",
  Ranked: "#eb2f96",
};

const diffIcons = {
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

class MapCard extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    let StatusIcon = icons[this.props.status] || InfoCircleTwoTone;

    return (
      <Card
        title={
          <div className="MapCard-title">
            <div>
              <StatusIcon
                twoToneColor={colors[this.props.status]}
                onClick={() => this.props.edit && this.props.edit(this.props)}
                className="MapCard-status"
              />
              <Tooltip
                title={`Requested ${new Date(this.props.requestDate).toLocaleDateString("en-US")}`}
              >{` ${this.props.status}`}</Tooltip>
            </div>
            {this.props.showModType && (
              <div className="MapCard-mod-type">{this.props.m4m ? "M4M" : "NM"}</div>
            )}
          </div>
        }
        bordered={true}
        cover={
          <a target="_blank" href={`https://osu.ppy.sh/b/${this.props.mapId}`}>
            <img src={this.props.image} />
          </a>
        }
        className="MapCard-card"
      >
        <div className="MapCard-row MapCard-primary">{this.props.title}</div>
        <div className="MapCard-row">{this.props.artist}</div>
        <div className="MapCard-row">{`Mapset by ${this.props.creator}`}</div>

        {!this.props.compact && (
          <>
            <div className="MapCard-divider"></div>
            <div className="MapCard-attr-list">
              <span className="MapCard-attr">
                <ClockCircleTwoTone /> {this.props.length}
              </span>
              <span className="MapCard-attr">
                <DashboardTwoTone /> {this.props.bpm}bpm
              </span>
            </div>

            {this.props.comment && (
              <>
                <div className="MapCard-divider"></div>
                <div className="MapCard-comment">
                  <span className="u-bold">Mapper's Comment: </span>
                  {this.props.comment}
                </div>
              </>
            )}
          </>
        )}

        {this.props.feedback && (
          <>
            <div className="MapCard-divider"></div>
            <div className="MapCard-comment">
              <span className="u-bold">Feedback: </span>
              {this.props.feedback}
            </div>
          </>
        )}

        {!this.props.compact && (
          <>
            <div className="MapCard-divider"></div>
            <div className="MapCard-diff-list">
              {this.props.diffs.map((diff) => (
                <Tooltip key={diff._id} title={`${diff.name} (${diff.sr}☆)`} placement="bottom">
                  <Icon
                    style={{ fontSize: 24, color: getDiffColor(diff.sr), padding: 5 }}
                    component={diffIcons[diff.mode]}
                  />
                </Tooltip>
              ))}
            </div>
          </>
        )}
      </Card>
    );
  }
}

export default MapCard;
