import React, { Fragment, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { connect, useDispatch, useSelector } from "react-redux";
import { LuExternalLink, LuMinus, LuPlus, LuSearch } from "react-icons/lu";
import { Link, useParams } from "react-router-dom";
import moment from "moment";

import { createCdc, runQuery, selectChart } from "../../../slices/chart";
import { Avatar, AvatarGroup, Button, Card, CardBody, CardFooter, CardHeader, Chip, Divider, Input, ScrollShadow, Spacer, Tab, Tabs } from "@nextui-org/react";
import Text from "../../../components/Text";
import Row from "../../../components/Row";
import connectionImages from "../../../config/connectionImages";
import { getDatasets, selectDatasets } from "../../../slices/dataset";
import useThemeDetector from "../../../modules/useThemeDetector";
import ChartDatasetConfig from "./ChartDatasetConfig";
import { chartColors } from "../../../config/colors";
import { selectTeam } from "../../../slices/team";
import canAccess from "../../../config/canAccess";

function ChartDatasets(props) {
  const { projects, chartId, user } = props;

  const chart = useSelector((state) => selectChart(state, chartId));
  const datasets = useSelector(selectDatasets) || [];

  const [datasetSearch, setDatasetSearch] = useState("");
  const [tag, setTag] = useState("project");
  const [addMode, setAddMode] = useState(false);
  const [activeCdc, setActiveCdc] = useState(null);

  const dispatch = useDispatch();
  const params = useParams();
  const isDark = useThemeDetector();
  const team = useSelector(selectTeam);

  const initRef = useRef(null);

  useEffect(() => {
    if (!datasets || datasets.length === 0) {
      dispatch(getDatasets({ team_id: params.teamId }));
    }
  }, []);

  useEffect(() => {
    if (datasets?.length > 0 && !initRef.current) {
      initRef.current = true;
      const projectDatasets = datasets.filter((d) => (
        !d.draft
        && d?.legend.toLowerCase().includes(datasetSearch.toLowerCase())
        && d.project_ids?.includes(chart.project_id)
      ));
      if (projectDatasets.length === 0) {
        setTag("team");
      }
    }
  }, [datasets]);

  const _filteredDatasets = () => {
    if (tag === "project") {
      return datasets.filter((d) => (
        !d.draft
        && d.legend.toLowerCase().includes(datasetSearch.toLowerCase())
        && d.project_ids?.includes(chart.project_id)
      ));
    }
    return datasets.filter((d) => !d.draft && d.legend && d.legend?.toLowerCase().includes(datasetSearch.toLowerCase()));
  };

  const _getDatasetTags = (dataset) => {
    const tags = [];
    if (!projects) return tags;
    dataset.project_ids?.forEach((projectId) => {
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        tags.push(project.name);
      }
    });

    return tags;
  };

  const _onCreateCdc = (datasetId) => {
    // find out the perfect color for the new cdc
    const existingColors = chart.ChartDatasetConfigs.map((cdc) => cdc.datasetColor.toLowerCase());
    const newColor = Object.values(chartColors).find((color) => !existingColors.includes(color.hex.toLowerCase()) && !existingColors.includes(color.rgb));

    dispatch(createCdc({
      project_id: chart.project_id,
      chart_id: chart.id,
      data: {
        dataset_id: datasetId,
        datasetColor: newColor.hex,
        fill: false,
        order: chart.ChartDatasetConfigs[chart.ChartDatasetConfigs.length - 1]?.order + 1 || 0,
      },
    }))
      .then((res) => {
        setActiveCdc(res.payload.id);
        dispatch(runQuery({
          project_id: chart.project_id,
          chart_id: chart.id,
          noSource: false,
          skiParsing: false,
          getCache: true,
        }));
      });
    
    setAddMode(false);
  };

  return (
    <div>
      <Row align={"center"} className={"justify-between"}>
        <Text size="h4">Datasets</Text>
        <Button
          isIconOnly
          variant="faded"
          size="sm"
          onClick={() => setAddMode(!addMode)}
        >
          {!addMode && (<LuPlus />)}
          {addMode && (<LuMinus />)}
        </Button>
      </Row>
      <Spacer y={4} />
      <Divider />
      <Spacer y={4} />

      {(chart?.ChartDatasetConfigs?.length === 0 || addMode) && (
        <>
          <Input
            placeholder="Search datasets"
            value={datasetSearch}
            onChange={(e) => setDatasetSearch(e.target.value)}
            startContent={<LuSearch />}
            variant="bordered"
          />
          <Spacer y={2} />
          <Row align="center" className={"gap-1"}>
            <Chip
              color={tag === "project" ? "primary" : "default"}
              variant={tag === "project" ? "solid" : "bordered"}
              radius="sm"
              onClick={() => setTag("project")}
              className="cursor-pointer"
            >
              This project
            </Chip>
            <Chip
              color={tag === "team" ? "primary" : "default"}
              variant={tag === "team" ? "solid" : "bordered"}
              radius="sm"
              onClick={() => setTag("team")}
              className="cursor-pointer"
            >
              All
            </Chip>
            <Spacer x={1} />
            <Text size="sm">{`${_filteredDatasets().length} datasets found`}</Text>
          </Row>
          <Spacer y={4} />

          <ScrollShadow className="max-h-[500px] w-full">
            {datasets.length > 0 && _filteredDatasets().map((dataset) => (
              <Fragment key={dataset.id}>
                <Card
                  isPressable
                  isHoverable
                  className="w-full shadow-none border-2 border-solid border-content3"
                  onClick={() => _onCreateCdc(dataset.id)}
                >
                  <CardHeader>
                    <div className={"flex flex-row justify-between gap-4 w-full"}>
                      <div className="flex flex-row gap-4 items-center justify-between w-full">
                        <div className="flex flex-col gap-1 items-start">
                          <Text b>{dataset.legend}</Text>
                          <div className="flex-wrap">
                            {_getDatasetTags(dataset).map((tag) => (
                              <Chip key={tag} size="sm" variant="flat" color="primary">
                                {tag}
                              </Chip>
                            ))}
                          </div>
                        </div>
                        <AvatarGroup size="sm" isBordered>
                          {dataset?.DataRequests?.map((dr) => (
                            <Avatar
                              key={dr.id}
                              src={connectionImages(isDark)[dr?.Connection?.subType]}
                              isBordered
                            />
                          ))}
                        </AvatarGroup>
                      </div>                      
                    </div>
                  </CardHeader>
                  <Divider />
                  <CardBody className="p-2">
                    <div className="w-full flex flex-row justify-between">
                      <div>
                        <Text b size="sm">Metric: </Text>
                        <Text size="sm">{dataset.xAxis?.replace("root[].", "").replace("root.", "")}</Text>
                      </div>
                      <div>
                        <Text b size="sm">Dimension: </Text>
                        <Text size="sm">{dataset.xAxis?.replace("root[].", "").replace("root.", "")}</Text>
                      </div>
                    </div>
                  </CardBody>
                  <Divider />
                  <CardFooter className="justify-between">
                    <Text className={"text-[12px]"}>{`Created ${moment(dataset.createdAt).calendar()}`}</Text>
                    {canAccess("teamAdmin", user.id, team?.TeamRoles) && (
                      <div className="z-50">
                        <Button
                          className="z-50"
                          size="sm"
                          variant="ghost"
                          endContent={<LuExternalLink size={16} />}
                          as={Link}
                          to={`/${team.id}/dataset/${dataset.id}`}
                          target="_blank"
                        >
                          Edit
                        </Button>
                      </div>
                    )}
                  </CardFooter>
                </Card>
                <Spacer y={2} />
              </Fragment>
            ))}
          </ScrollShadow>
          <Spacer y={8} />
        </>
      )}
      
      {chart?.ChartDatasetConfigs.length > 0 && (
        <div>
          <Tabs
            selectedKey={`${activeCdc}`}
            onSelectionChange={(key) => setActiveCdc(key)}
            fullWidth
          >
            {chart?.ChartDatasetConfigs.map((cdc) => (
              <Tab title={`${cdc.legend}`} key={cdc.id}>
                <ChartDatasetConfig chartId={chartId} datasetId={cdc.id} />
              </Tab>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
}

ChartDatasets.propTypes = {
  chartId: PropTypes.number.isRequired,
  projects: PropTypes.array.isRequired,
  user: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  projects: state.project.data,
  user: state.user.data,
});

const mapDispatchToProps = ({});

export default connect(mapStateToProps, mapDispatchToProps)(ChartDatasets);
