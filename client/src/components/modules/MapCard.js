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

import { Card, Tooltip } from "antd";
import "./MapCard.css";
import ModeIcon from "./ModeIcon";

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
                  <span>
                    <ModeIcon {...diff} />
                  </span>
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
