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

export function DiffList({ diffs }) {
  return (
    <div className="MapCard-diff-list">
      {diffs.map((diff) => (
        <Tooltip key={diff._id} title={`${diff.name} (${diff.sr}☆)`} placement="bottom">
          <span>
            <ModeIcon {...diff} />
          </span>
        </Tooltip>
      ))}
    </div>
  );
}

export function StatusLabel(props) {
  const StatusIcon = icons[props.status] || InfoCircleTwoTone;
  const lang = window.navigator.userLanguage || window.navigator.language || "en-US";
  return (
    <div>
      <StatusIcon
        twoToneColor={colors[props.status]}
        onClick={() => props.edit && props.edit(props)}
        className="MapCard-status"
      />
      <Tooltip
        title={`Requested ${new Date(props.requestDate).toLocaleDateString(lang)}`}
      >{` ${props.status}`}</Tooltip>
    </div>
  );
}

class MapCard extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  getLink = () =>
    this.props.mapsetId
      ? `https://osu.ppy.sh/s/${this.props.mapsetId}`
      : `https://osu.ppy.sh/b/${this.props.mapId}`;

  render() {
    return (
      <Card
        title={
          <div className="MapCard-title">
            <StatusLabel {...this.props} />
            {this.props.showModType && (
              <div className="MapCard-mod-type">{this.props.m4m ? "M4M" : "NM"}</div>
            )}
          </div>
        }
        bordered={true}
        cover={
          <a target="_blank" href={this.getLink()}>
            <img src={this.props.image} />
          </a>
        }
        className="MapCard-card"
      >
        <div className="MapCard-row MapCard-primary">
          <a className="MapCard-link" target="_blank" href={this.getLink()}>
            {this.props.title}
          </a>
        </div>
        <div className="MapCard-row">{this.props.artist}</div>
        {this.props.requester ? (
          <div className="MapCard-row">
            Requested to{" "}
            <a className="MapCard-link" target="_blank" href={`/${this.props.target.username}`}>
              {this.props.target.username}
            </a>
          </div>
        ) : (
            <>
              <div className="MapCard-row">
              Mapset by{" "}
              <a
                className="MapCard-link"
                target="_blank"
                href={`https://osu.ppy.sh/users/${this.props.creator}`}
              >
                {this.props.creator}
              </a>
            </div>
            {this.props.username && this.props.username !== this.props.creator && 
              <div className="MapCard-row">
                Requested by{" "}
                <a
                  className="MapCard-link"
                  target="_blank"
                  href={`https://osu.ppy.sh/users/${this.props.username}`}
                >
                  {this.props.username}
                </a>
              </div>
            }
          </>
        )}

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
          </>
        )}

        {this.props.comment && (
          <>
            <div className="MapCard-divider"></div>
            <div className="MapCard-comment">
              <span className="u-bold">Mapper's Comment: </span>
              {this.props.comment}
            </div>
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
            <DiffList diffs={this.props.diffs} />
          </>
        )}
      </Card>
    );
  }
}

export default MapCard;
