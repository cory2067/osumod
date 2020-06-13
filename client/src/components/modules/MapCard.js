import React, { Component } from "react";
import {
  InfoCircleTwoTone,
  StarOutlined,
  ClockCircleTwoTone,
  DashboardTwoTone,
} from "@ant-design/icons";
import { Link } from "@reach/router";

import { Card, Popconfirm } from "antd";
import "./MapCard.css";

class MapCard extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <Card
        title={
          <div className="MapCard-title">
            <InfoCircleTwoTone className="MapCard-status" /> Pending
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
        <div className="MapCard-row MapCard-primary">
          <span>{this.props.title}</span>
          <span>
            <span className="MapCard-attr">
              <ClockCircleTwoTone /> {this.props.length}
            </span>
            <span className="MapCard-attr">
              <DashboardTwoTone /> {this.props.bpm}bpm
            </span>
          </span>
        </div>
        <div className="MapCard-row">{this.props.artist}</div>
        <div className="MapCard-row">{`Mapset by ${this.props.creator}`}</div>

        <div className="MapCard-divider"></div>
        <div className="MapCard-diff-list">
          {this.props.diffs.map((diff) => (
            <div className="MapCard-diff">
              <div className="u-bold">{diff.name}</div>
              <div>
                {diff.sr} <StarOutlined />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }
}

export default MapCard;
