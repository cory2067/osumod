import React, { Component } from "react";
import ReactMarkdown from "react-markdown";
import "../../utilities.css";
import "./List.css";

// data from "../../content/home-en";
import { Layout, Button, Modal, Input, Form, Select, Switch } from "antd";
const { TextArea } = Input;
import { get, post } from "../../utilities";
import MapCard from "../modules/MapCard";
const { Content } = Layout;

class List extends Component {
  constructor(props) {
    super(props);
    this.form = React.createRef();
    this.state = { reqs: [], editing: null };
  }

  componentDidMount() {
    get("/api/requests", {
      archived: this.props.archived,
      target: this.props.owner,
    }).then((reqs) => this.setState({ reqs }));

    get("/api/settings", { owner: this.props.owner }).then((settings) =>
      this.setState({ m4m: settings.m4m })
    );
  }

  edit = (req) => {
    if (!this.props.user.admin) return;
    this.setState({ editing: req._id });
    // this is jank, todo fix this
    setTimeout(() => this.form.current.setFieldsValue({ feedback: "", ...req }));
  };

  onFinish = async (form) => {
    console.log(form);
    const updated = await post("/api/request-edit", { ...form, id: this.state.editing });
    console.log(updated);
    this.setState({
      editing: null,
      reqs: this.state.reqs.map((req) => (req._id === this.state.editing ? updated : req)),
    });
  };

  render() {
    return (
      <Content className="content">
        <h1 className="List-header">
          {this.props.owner}'s {this.props.archived ? "Archives" : "Nomination Queue"}
        </h1>
        <div className="List-container">
          {this.state.reqs.map((req) => (
            <MapCard
              {...req}
              admin={this.props.user.admin}
              edit={this.edit}
              key={req._id}
              compact={this.props.archived}
              showModType={this.state.m4m && !this.props.archived}
            />
          ))}
        </div>
        <Modal
          title="Manage Request"
          visible={this.state.editing}
          footer={false}
          onCancel={() => this.setState({ editing: null })}
        >
          <Form ref={this.form} onFinish={this.onFinish} name="edit">
            <Form.Item label="Status" name="status">
              <Select>
                <Select.Option value="Pending">Pending</Select.Option>
                <Select.Option value="Rejected">Rejected</Select.Option>
                <Select.Option value="Accepted">Accepted</Select.Option>
                <Select.Option value="Nominated">Nominated</Select.Option>
                <Select.Option value="Ranked">Ranked</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="Feedback" name="feedback">
              <TextArea rows={3} />
            </Form.Item>
            <Form.Item label="Archived" name="archived" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                Submit
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    );
  }
}

export default List;
